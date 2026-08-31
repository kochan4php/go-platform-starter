package main

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRunOverview(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/users/product/overview" || r.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatalf("unexpected request: %s %q", r.URL.Path, r.Header.Get("Authorization"))
		}
		_, _ = io.WriteString(w, `{"data":{"users":{"total":2}}}`)
	}))
	defer server.Close()
	t.Setenv("PLATFORM_URL", server.URL)
	t.Setenv("PLATFORM_TOKEN", "test-token")
	var output bytes.Buffer
	if err := run([]string{"overview"}, &output); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(output.String(), `"total": 2`) {
		t.Fatalf("unexpected output: %s", output.String())
	}
}

func TestRunRequiresToken(t *testing.T) {
	t.Setenv("PLATFORM_TOKEN", "")
	if err := run([]string{"overview"}, io.Discard); err == nil {
		t.Fatal("expected missing token error")
	}
}
