package platform

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
)

type ctxKey int

const (
	ctxKeyRequestID ctxKey = iota
	ctxKeyLogger
)

func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(ctxKeyRequestID).(string)
	return id
}

func LoggerFromContext(ctx context.Context) *slog.Logger {
	log, ok := ctx.Value(ctxKeyLogger).(*slog.Logger)
	if !ok {
		return slog.Default()
	}
	return log
}

func withRequestScope(ctx context.Context, id string, log *slog.Logger) context.Context {
	ctx = context.WithValue(ctx, ctxKeyRequestID, id)
	return context.WithValue(ctx, ctxKeyLogger, log)
}

var (
	requestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{Name: "http_requests_total"},
		[]string{"method", "route", "status"},
	)
	requestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Buckets: []float64{0.005, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "route"},
	)
)

func init() {
	prometheus.MustRegister(requestsTotal, requestDuration)
}

func newRequestID() string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func CorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = newRequestID()
		}
		w.Header().Set("X-Request-ID", id)
		base := LoggerFromContext(r.Context())
		reqLog := base.With("request_id", id)
		next.ServeHTTP(w, r.WithContext(withRequestScope(r.Context(), id, reqLog)))
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func Observe(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)

		route := r.URL.Path
		if rctx := chiRouteContext(r); rctx != nil && rctx.RoutePattern() != "" {
			route = rctx.RoutePattern()
		}
		requestsTotal.WithLabelValues(r.Method, route, strconv.Itoa(rec.status)).Inc()
		requestDuration.WithLabelValues(r.Method, route).Observe(time.Since(start).Seconds())
	})
}

func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		LoggerFromContext(r.Context()).Info("http request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if p := recover(); p != nil {
				LoggerFromContext(r.Context()).Error("panic recovered", "panic", p, "stack", string(debug.Stack()))
				Fail(w, http.StatusInternalServerError, "internal_server_error", "")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
