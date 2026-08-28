package platform

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"os"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
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

const tracerName = "github.com/kochan4php/go-platform-starter/internal/platform"

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

func validRequestID(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	for _, r := range id {
		if !(r >= 'a' && r <= 'z') && !(r >= 'A' && r <= 'Z') && !(r >= '0' && r <= '9') && !strings.ContainsRune("._:-", r) {
			return false
		}
	}
	return true
}

// Trace (PLAN item 70) continues an incoming trace via the traceparent header
// and starts this service's server span. With tracing disabled the OTel
// no-op tracer makes this middleware free.
func Trace(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))
		tctx, span := otel.Tracer(tracerName).Start(ctx, r.Method+" "+r.URL.Path)
		defer span.End()
		next.ServeHTTP(w, r.WithContext(tctx))
	})
}

// InjectTraceHeaders writes the active span context onto outgoing request
// headers so reverse-proxied calls continue the same trace (PLAN item 70).
func InjectTraceHeaders(ctx context.Context, h http.Header) {
	otel.GetTextMapPropagator().Inject(ctx, propagation.HeaderCarrier(h))
}

// slowRequestThreshold is the env-tunable slow-request log gate (item 73).
var slowRequestThreshold = readSlowRequestThreshold()

func readSlowRequestThreshold() time.Duration {
	if ms, err := strconv.Atoi(os.Getenv("SLOW_REQUEST_THRESHOLD_MS")); err == nil && ms > 0 {
		return time.Duration(ms) * time.Millisecond
	}
	return 500 * time.Millisecond
}

// SetSlowRequestThreshold lets a service override the env default at boot.
func SetSlowRequestThreshold(d time.Duration) {
	if d > 0 {
		slowRequestThreshold = d
	}
}

func CorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if !validRequestID(id) {
			id = newRequestID()
		}
		w.Header().Set("X-Request-ID", id)
		base := LoggerFromContext(r.Context())
		reqLog := base.With("request_id", id, "trace_id", TraceIDFromContext(r.Context()))
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
		dur := time.Since(start)
		args := []any{
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", dur.Milliseconds(),
		}
		log := LoggerFromContext(r.Context())
		if dur >= slowRequestThreshold {
			log.Warn("slow http request", args...)
			return
		}
		log.Info("http request", args...)
	})
}

func Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if p := recover(); p != nil {
				err := toError(p)
				LoggerFromContext(r.Context()).Error("panic recovered", "panic", p, "stack", string(debug.Stack()))
				ReportError(r.Context(), err, "panic in %s %s", r.Method, r.URL.Path)
				Fail(w, http.StatusInternalServerError, "internal_server_error", "")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
