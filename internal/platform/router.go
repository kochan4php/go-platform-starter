package platform

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// NewRouter is THE entry point every service uses for its HTTP surface:
// a chi router with panic-recovery and request-ID correlation/logging already
// mounted, ready for RegisterHealth + route handlers.
//
//	log := platform.NewLogger(cfg.LogLevel)
//	r := platform.NewRouter(log)
//	platform.RegisterHealth(r, "db", pool.Ping)
//	r.Post("/api/v1/whatever", h.Create)
//	return platform.GracefulRun(ctx, log, cfg.Server, r)
func NewRouter(log *slog.Logger) chi.Router {
	r := chi.NewRouter()
	// Logger outermost so access logs see the FINAL status (incl. recovered 500s).
	r.Use(RequestLogger(log, "/healthz", "/readyz"))
	r.Use(Recover(log))
	return r
}

// HealthCheck is a readiness probe; return nil when the dependency is usable.
type HealthCheck func(ctx context.Context) error

// RegisterHealth mounts /healthz and /readyz on a chi router with the exact
// JSON shapes the TypeScript health endpoints emitted:
//
//	/healthz -> {"success":true,"message":"Health check success",
//	             "data":{"status":"UP","uptime":…,"timestamp":…}}
//	/readyz  -> {"success":true,"message":"<name> is healthy",
//	             "data":{"<name>Healthy":true,…}}  |  503 on failure
func RegisterHealth(r chi.Router, readyName string, readyCheck HealthCheck) {
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		WriteSuccess(w, http.StatusOK, "Health check success", map[string]any{
			"status":    "UP",
			"uptime":    uptimeSeconds(),
			"timestamp": nowMillis(),
		})
	})

	r.Get("/readyz", func(w http.ResponseWriter, req *http.Request) {
		data := map[string]any{readyName + "Healthy": true}

		if err := safeCheck(readyCheck, req.Context()); err != nil {
			data[readyName+"Healthy"] = false
			WriteFailed(w, http.StatusServiceUnavailable, readyName+" is unhealthy", data)
			return
		}

		writeJSON(w, http.StatusOK, SuccessEnvelope{
			Success: true,
			Message: readyName + " is healthy",
			Data:    data,
		})
	})
}
