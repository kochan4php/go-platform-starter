// Package internal holds the _template service's private implementation.
// Code here cannot be imported by other services — the compiler enforces it.
package internal

import (
	"log/slog"
	"net/http"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	gen "github.com/kochan4php/go-platform-starter/services/_template/gen"
)

var _ gen.ServerInterface = (*Handlers)(nil)

type Handlers struct {
	Log *slog.Logger
}

func NewHandlers(log *slog.Logger) *Handlers {
	return &Handlers{Log: log.With("component", "handlers")}
}

func (h *Handlers) Ping(w http.ResponseWriter, _ *http.Request) {
	platform.OK(w, http.StatusOK, "pong", map[string]string{"service": "_template"})
}
