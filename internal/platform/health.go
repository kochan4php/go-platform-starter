package platform

import (
	"context"
	"net/http"
	"os"
	"runtime"
	"sync/atomic"
	"time"

	"github.com/go-chi/chi/v5"
)

func chiRouteContext(r *http.Request) *chi.Context {
	return chi.RouteContext(r.Context())
}

type Checker func(ctx context.Context) error

var draining atomic.Bool

func Drain(w http.ResponseWriter, r *http.Request) {
	draining.Store(true)
	delay := 5 * time.Second
	if value, err := time.ParseDuration(os.Getenv("PRESTOP_DRAIN_DELAY")); err == nil && value >= 0 {
		delay = value
	}
	select {
	case <-time.After(delay):
	case <-r.Context().Done():
	}
	OK(w, http.StatusOK, "draining", map[string]string{"status": "draining"})
}

func Healthz(w http.ResponseWriter, r *http.Request) {
	data := map[string]string{
		"status": "alive", "version": buildValue("APP_VERSION", "dev"), "commit": buildValue("GIT_COMMIT", "unknown"),
	}
	if r.URL.Query().Get("detail") == "1" {
		data["goVersion"] = runtime.Version()
		data["environment"] = buildValue("APP_ENV", "development")
	}
	OK(w, http.StatusOK, "ok", data)
}

func Version(w http.ResponseWriter, _ *http.Request) {
	OK(w, http.StatusOK, "ok", map[string]string{
		"version": buildValue("APP_VERSION", "dev"),
		"commit":  buildValue("GIT_COMMIT", "unknown"),
	})
}

func Readyz(checkers map[string]Checker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		results := make(map[string]any, len(checkers)+2)
		failed := draining.Load()
		if failed {
			results["drain"] = map[string]any{"status": "fail", "error": "instance is draining"}
		}
		for name, check := range checkers {
			start := time.Now()
			err := check(r.Context())
			result := map[string]any{"status": "ok", "latencyMs": time.Since(start).Milliseconds()}
			if err != nil {
				result["status"] = "fail"
				result["error"] = err.Error()
				failed = true
			}
			results[name] = result
		}
		status := http.StatusOK
		msg := "ready"
		if failed {
			status = http.StatusServiceUnavailable
			msg = "not_ready"
		}
		OK(w, status, msg, results)
	}
}

func buildValue(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
