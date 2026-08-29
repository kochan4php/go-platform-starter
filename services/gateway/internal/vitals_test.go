package internal

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWebVitalsBoundsLabels(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/telemetry/vitals", strings.NewReader(`{"name":"LCP","value":1250,"rating":"good"}`))
	response := httptest.NewRecorder()
	WebVitals(response, request)
	if response.Code != http.StatusNoContent {
		t.Fatalf("valid vital status = %d", response.Code)
	}

	request = httptest.NewRequest(http.MethodPost, "/telemetry/vitals", strings.NewReader(`{"name":"raw-route","value":1,"rating":"good"}`))
	response = httptest.NewRecorder()
	WebVitals(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unbounded label status = %d", response.Code)
	}
}

func TestFrontendErrorReporterBoundsPayload(t *testing.T) {
	handler := FrontendErrors(slog.New(slog.NewTextHandler(io.Discard, nil)))
	valid := httptest.NewRequest(http.MethodPost, "/telemetry/errors", strings.NewReader(`{"kind":"boundary","message":"render failed","route":"/admin/users","breadcrumbs":[{"type":"navigation","target":"/admin/users","at":1}]}`))
	response := httptest.NewRecorder()
	handler(response, valid)
	if response.Code != http.StatusNoContent {
		t.Fatalf("valid report status = %d body=%s", response.Code, response.Body)
	}

	invalid := httptest.NewRequest(http.MethodPost, "/telemetry/errors", strings.NewReader(`{"kind":"arbitrary-user-label","message":"x"}`))
	response = httptest.NewRecorder()
	handler(response, invalid)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unbounded kind status = %d", response.Code)
	}
}

func TestStatusPageAggregatesReadiness(t *testing.T) {
	ok := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }))
	defer ok.Close()
	down := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusServiceUnavailable) }))
	defer down.Close()

	request := httptest.NewRequest(http.MethodGet, "/status", nil)
	response := httptest.NewRecorder()
	StatusPage(Upstreams{"auth": ok.URL, "worker": down.URL})(response, request)
	if body := response.Body.String(); !strings.Contains(body, "Some systems are unavailable") || !strings.Contains(body, "auth") || !strings.Contains(body, "worker") {
		t.Fatalf("unexpected status page: %s", body)
	}
}
