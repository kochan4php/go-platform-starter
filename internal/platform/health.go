package platform

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func chiRouteContext(r *http.Request) *chi.Context {
	return chi.RouteContext(r.Context())
}

type Checker func(ctx context.Context) error

func Healthz(w http.ResponseWriter, _ *http.Request) {
	OK(w, http.StatusOK, "ok", map[string]string{"status": "alive"})
}

func Readyz(checkers map[string]Checker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		results := make(map[string]string, len(checkers))
		failed := false
		for name, check := range checkers {
			if err := check(r.Context()); err != nil {
				results[name] = "fail: " + err.Error()
				failed = true
			} else {
				results[name] = "ok"
			}
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
