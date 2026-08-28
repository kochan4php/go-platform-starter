package internal

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProxyUsesValidatedClientIP(t *testing.T) {
	forwarded := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		forwarded <- r.Header.Get("X-Forwarded-For")
		w.WriteHeader(http.StatusNoContent)
	}))
	defer upstream.Close()

	handler := ProxyHandler(ProxyDeps{
		Log:       slog.New(slog.NewTextHandler(io.Discard, nil)),
		Matcher:   NewMatcher([]Route{{Method: http.MethodPost, Path: "/api/v1/auth/login", Service: "auth"}}),
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
}
