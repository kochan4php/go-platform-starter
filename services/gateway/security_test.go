package main

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"path/filepath"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/go-redis/redis_rate/v10"
	"github.com/kochan4php/go-platform-starter/internal/testutil"
	gatewayinternal "github.com/kochan4php/go-platform-starter/services/gateway/internal"
	"github.com/redis/go-redis/v9"
)

func TestClientIPOnlyTrustsConfiguredProxy(t *testing.T) {
	request := httptest.NewRequest("GET", "http://gateway.test/", nil)
	request.RemoteAddr = "203.0.113.9:54321"
	request.Header.Set("X-Forwarded-For", "198.51.100.7")
	if got := clientIP(request, nil); got != "203.0.113.9" {
		t.Fatalf("untrusted forwarded address accepted: %q", got)
	}

	request.RemoteAddr = "10.0.0.5:1234"
	trusted := []netip.Prefix{netip.MustParsePrefix("10.0.0.0/8")}
	if got := clientIP(request, trusted); got != "198.51.100.7" {
		t.Fatalf("trusted proxy address = %q", got)
	}
}

func TestCrossOriginCredentialRequestsAreNotAllowed(t *testing.T) {
	handler := corsHandler("https://trusted.example")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	request := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", nil)
	request.Header.Set("Origin", "https://evil.example")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if origin := recorder.Header().Get("Access-Control-Allow-Origin"); origin != "" {
		t.Fatalf("untrusted origin received credential permission: %q", origin)
	}

	request = httptest.NewRequest(http.MethodOptions, "/api/v1/auth/refresh", nil)
	request.Header.Set("Origin", "https://trusted.example")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	if origin := recorder.Header().Get("Access-Control-Allow-Origin"); origin != "https://trusted.example" {
		t.Fatalf("trusted origin not allowed: %q", origin)
	}
}

func TestStrictRateLimitsAreIsolatedPerRoute(t *testing.T) {
	client := redis.NewClient(&redis.Options{Addr: testutil.StartRedis(t)})
	t.Cleanup(func() { _ = client.Close() })
	matcher := gatewayinternal.NewMatcher([]gatewayinternal.Route{
		{Method: http.MethodPost, Path: "/api/v1/auth/login", RateClass: "strict"},
		{Method: http.MethodPost, Path: "/api/v1/auth/refresh", RateClass: "strict"},
	})
	handler := edgeRateLimit(
		redis_rate.NewLimiter(client),
		slog.New(slog.NewTextHandler(io.Discard, nil)),
		1,
		matcher,
		nil,
	)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	request := func(path string) int {
		req := httptest.NewRequest(http.MethodPost, path, nil)
		req.RemoteAddr = "203.0.113.9:54321"
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		return res.Code
	}

	if got := request("/api/v1/auth/login"); got != http.StatusNoContent {
		t.Fatalf("first login status = %d", got)
	}
	if got := request("/api/v1/auth/login"); got != http.StatusTooManyRequests {
		t.Fatalf("second login status = %d", got)
	}
	if got := request("/api/v1/auth/refresh"); got != http.StatusNoContent {
		t.Fatalf("refresh shared the login bucket: status = %d", got)
	}
}

func TestServiceOpenAPISpecsValidate(t *testing.T) {
	specs, err := filepath.Glob("../*/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	for _, spec := range specs {
		t.Run(filepath.Base(filepath.Dir(spec)), func(t *testing.T) {
			doc, err := openapi3.NewLoader().LoadFromFile(spec)
			if err != nil {
				t.Fatal(err)
			}
			if err := doc.Validate(context.Background()); err != nil {
				t.Fatal(err)
			}
		})
	}
}
