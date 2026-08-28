package main

import (
	"context"
	"net/http/httptest"
	"net/netip"
	"path/filepath"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
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
