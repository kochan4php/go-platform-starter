package platform

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

var processStart = time.Now()

// uptimeSeconds mirrors Node's process.uptime() semantics for the health payload.
func uptimeSeconds() float64 {
	return time.Since(processStart).Seconds()
}

func nowMillis() int64 { return time.Now().UnixMilli() }

// RegisterHealth mounts /healthz and /readyz on the mux with the exact JSON
// shapes the TypeScript health endpoints emitted.
//
//	/healthz -> {"success":true,"message":"Health check success",
//	             "data":{"status":"UP","uptime":1.23,"timestamp":169...}}
//	/readyz  -> {"success":true,"message":"<name> is healthy","data":{"<name>Healthy":true,...}}
//	          | 503 {"success":false,"message":"<name> is unhealthy","data":{"<name>Healthy":false,...}}
func RegisterHealth(mux *http.ServeMux, readyName string, readyCheck func(ctx context.Context) error) {
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		WriteSuccess(w, http.StatusOK, "Health check success", map[string]any{
			"status":    "UP",
			"uptime":    uptimeSeconds(),
			"timestamp": nowMillis(),
		})
	})

	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		data := map[string]any{readyName + "Healthy": true}

		if err := safeCheck(readyCheck, r.Context()); err != nil {
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

// safeCheck keeps a failing readiness probe from ever taking the process down.
func safeCheck(check func(ctx context.Context) error, ctx context.Context) (err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("readiness check panicked: %v", rec)
		}
	}()
	return check(ctx)
}
