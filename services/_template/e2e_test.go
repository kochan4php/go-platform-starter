package main

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	gen "github.com/kochan4php/go-platform-starter/services/_template/gen"
	internal "github.com/kochan4php/go-platform-starter/services/_template/internal"
)

// TestGeneratedServicePing is the generated end-to-end contract stub.
func TestGeneratedServicePing(t *testing.T) {
	router := chi.NewRouter()
	gen.HandlerFromMux(internal.NewHandlers(slog.New(slog.NewTextHandler(io.Discard, nil))), router)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/ping", nil))
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "pong") {
		t.Fatalf("ping status=%d body=%s", response.Code, response.Body.String())
	}
}
