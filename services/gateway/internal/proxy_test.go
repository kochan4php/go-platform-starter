package internal

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/testutil"
	"github.com/redis/go-redis/v9"
)

func TestProxyUsesValidatedClientIP(t *testing.T) {
	forwarded := make(chan string, 1)
	transformed := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		forwarded <- r.Header.Get("X-Forwarded-For")
		transformed <- r.Header.Get("X-Read-Model")
		w.WriteHeader(http.StatusNoContent)
	}))
	defer upstream.Close()

	handler := ProxyHandler(ProxyDeps{
		Log: slog.New(slog.NewTextHandler(io.Discard, nil)),
		Matcher: NewMatcher([]Route{{
			Method: http.MethodPost, Path: "/api/v1/auth/login", Service: "auth",
			RequestHeaders: map[string]string{"X-Read-Model": "dashboard"},
		}}),
		Upstreams: Upstreams{"auth": upstream.URL},
		ClientIP:  func(*http.Request) string { return "203.0.113.7" },
	})(http.NotFoundHandler())
	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", nil)
	request.Header.Set("X-Forwarded-For", "192.168.1.1")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("status = %d", recorder.Code)
	}
	if got := <-forwarded; got != "203.0.113.7" {
		t.Fatalf("forwarded client IP = %q", got)
	}
	if got := <-transformed; got != "dashboard" {
		t.Fatalf("transformed header = %q", got)
	}
}

func TestIdempotencyReplaysSuccessfulResponse(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: testutil.StartRedis(t)})
	t.Cleanup(func() { _ = rdb.Close() })
	calls := 0
	serve := func(w http.ResponseWriter) {
		calls++
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"id":1}`))
	}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/users", nil)
	request.Header.Set("Idempotency-Key", "create-user-1")
	first := httptest.NewRecorder()
	serveIdempotent(first, request, rdb, "42", serve)
	second := httptest.NewRecorder()
	serveIdempotent(second, request, rdb, "42", serve)
	if calls != 1 {
		t.Fatalf("handler calls = %d", calls)
	}
	if second.Code != http.StatusCreated || second.Header().Get("Idempotency-Replayed") != "true" {
		t.Fatalf("replay = %d %v", second.Code, second.Header())
	}
	mismatchRequest := httptest.NewRequest(http.MethodPost, "/api/v1/users", strings.NewReader(`{"different":true}`))
	mismatchRequest.Header.Set("Idempotency-Key", "create-user-1")
	mismatch := httptest.NewRecorder()
	serveIdempotent(mismatch, mismatchRequest, rdb, "42", serve)
	if mismatch.Code != http.StatusConflict || calls != 1 {
		t.Fatalf("mismatch = %d, calls = %d", mismatch.Code, calls)
	}
}

func TestResilientTransportFailsOverGET(t *testing.T) {
	failed := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer failed.Close()
	healthy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer healthy.Close()

	transport, err := newResilientTransport(failed.URL+","+healthy.URL, http.DefaultTransport.(*http.Transport).Clone())
	if err != nil {
		t.Fatal(err)
	}
	request, _ := http.NewRequest(http.MethodGet, failed.URL+"/probe", nil)
	response, err := transport.RoundTrip(request)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d", response.StatusCode)
	}
}

func TestResilientTransportHedgesSlowGET(t *testing.T) {
	slow := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(600 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer slow.Close()
	fast := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	defer fast.Close()

	transport, err := newResilientTransport(slow.URL+","+fast.URL, http.DefaultTransport.(*http.Transport).Clone())
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.WithValue(context.Background(), routePolicyKey{}, routePolicy{hedge: true})
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, slow.URL+"/probe", nil)
	started := time.Now()
	response, err := transport.RoundTrip(request)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d", response.StatusCode)
	}
	if elapsed := time.Since(started); elapsed >= 500*time.Millisecond {
		t.Fatalf("hedge took %s", elapsed)
	}
}

func TestResilientTransportServesFreshCachedResponsePerConsumer(t *testing.T) {
	calls := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		calls++
		_, _ = w.Write([]byte("cached"))
	}))
	defer upstream.Close()
	transport, err := newResilientTransport(upstream.URL, http.DefaultTransport.(*http.Transport).Clone())
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.WithValue(context.Background(), routePolicyKey{}, routePolicy{cacheTTL: time.Minute})
	for i := range 2 {
		request, _ := http.NewRequestWithContext(ctx, http.MethodGet, upstream.URL+"/stats", nil)
		request.Header.Set("X-User-Id", "42")
		response, err := transport.RoundTrip(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		if i == 1 && response.Header.Get("X-Cache") != "HIT" {
			t.Fatalf("second response cache marker = %q", response.Header.Get("X-Cache"))
		}
	}
	if calls != 1 {
		t.Fatalf("upstream calls = %d, want 1", calls)
	}
}
