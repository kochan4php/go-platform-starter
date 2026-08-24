package platform

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// NewRouter returns a chi router pre-wired with the standard middleware stack
// (correlation, logging, metrics, recovery) and the standard probes mounted:
// GET /healthz, GET /readyz (backed by the given checkers), GET /metrics.
// Services mount their business routes on the returned router.
func NewRouter(log *slog.Logger, ready map[string]Checker) chi.Router {
	r := chi.NewRouter()
	r.Use(Observe)
	r.Use(CorrelationID)
	r.Use(RequestLogger)
	r.Use(Recoverer)

	r.Get("/healthz", Healthz)
	if len(ready) > 0 {
		r.Get("/readyz", Readyz(ready))
	} else {
		r.Get("/readyz", Healthz)
	}
	r.Method(http.MethodGet, "/metrics", promhttp.Handler())
	return r
}
