package internal

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

var frontendErrors = prometheus.NewCounterVec(prometheus.CounterOpts{
	Name: "frontend_errors_total", Help: "Browser errors received by the central error reporter.",
}, []string{"kind"})

func init() { prometheus.MustRegister(frontendErrors) }

type frontendError struct {
	Kind        string `json:"kind"`
	Message     string `json:"message"`
	Stack       string `json:"stack"`
	Route       string `json:"route"`
	RequestID   string `json:"requestId"`
	Breadcrumbs []struct {
		Type   string `json:"type"`
		Target string `json:"target"`
		At     int64  `json:"at"`
	} `json:"breadcrumbs"`
}

func FrontendErrors(log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer r.Body.Close()
		r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
		var sample frontendError
		decoder := json.NewDecoder(io.LimitReader(r.Body, 64<<10+1))
		if decoder.Decode(&sample) != nil || !validFrontendError(&sample) {
			http.Error(w, "invalid error report", http.StatusBadRequest)
			return
		}
		frontendErrors.WithLabelValues(sample.Kind).Inc()
		err := errors.New(sample.Message)
		log.ErrorContext(r.Context(), "frontend error", "kind", sample.Kind, "route", sample.Route, "request_id", sample.RequestID, "stack", sample.Stack, "breadcrumbs", sample.Breadcrumbs)
		platform.ReportError(r.Context(), err, "frontend %s on %s", sample.Kind, sample.Route)
		w.WriteHeader(http.StatusNoContent)
	}
}

func validFrontendError(sample *frontendError) bool {
	sample.Kind = strings.TrimSpace(sample.Kind)
	sample.Message = strings.TrimSpace(sample.Message)
	if sample.Kind != "boundary" && sample.Kind != "unhandled" && sample.Kind != "promise" {
		return false
	}
	if sample.Message == "" || len(sample.Message) > 1000 || len(sample.Stack) > 32<<10 || len(sample.Route) > 512 || len(sample.RequestID) > 64 || len(sample.Breadcrumbs) > 20 {
		return false
	}
	for _, crumb := range sample.Breadcrumbs {
		if (crumb.Type != "click" && crumb.Type != "submit" && crumb.Type != "navigation") || len(crumb.Target) > 160 {
			return false
		}
	}
	return true
}
