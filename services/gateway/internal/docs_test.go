package internal

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestScalarPageHasExecutableCSPAndSRI(t *testing.T) {
	_, page := ScalarHandlers(func() []byte { return []byte(`{}`) })
	recorder := httptest.NewRecorder()
	page(recorder, httptest.NewRequest(http.MethodGet, "/docs", nil))

	policy := recorder.Header().Get("Content-Security-Policy")
	if !strings.Contains(policy, "script-src 'self' https://cdn.jsdelivr.net") {
		t.Fatalf("Scalar CDN missing from CSP: %q", policy)
	}
	if !strings.Contains(recorder.Body.String(), `integrity="sha384-`) {
		t.Fatal("Scalar script is missing subresource integrity")
	}
}
