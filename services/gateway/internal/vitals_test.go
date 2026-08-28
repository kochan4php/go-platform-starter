package internal

import (
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
