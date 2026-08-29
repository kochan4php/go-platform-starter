package platform

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"hash/fnv"
	"log/slog"
	"net/http"
	"os"
	"runtime/debug"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

type ctxKey int

const (
	ctxKeyRequestID ctxKey = iota
	ctxKeyLogger
	ctxKeyDebug
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

func debugRequest(ctx context.Context) bool {
	enabled, _ := ctx.Value(ctxKeyDebug).(bool)
	return enabled
}

func withBaseLogger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKeyLogger, log)))
		})
	}
}

// DebugRequest enables debug records only for a request carrying the shared
// operator token. The token is never logged or returned.
func DebugRequest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		want := os.Getenv("DEBUG_REQUEST_TOKEN")
		got := r.Header.Get("X-Debug-Token")
		if want != "" && subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1 && r.Header.Get("X-Debug-Log") == "1" {
			r = r.WithContext(context.WithValue(r.Context(), ctxKeyDebug, true))
			w.Header().Set("X-Debug-Log", "active")
		}
		next.ServeHTTP(w, r)
	})
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
		tctx, span := otel.Tracer(tracerName).Start(ctx, r.Method+" "+r.URL.Path, trace.WithSpanKind(trace.SpanKindServer))
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r.WithContext(tctx))
		route := r.URL.Path
		if rctx := chiRouteContext(r.WithContext(tctx)); rctx != nil && rctx.RoutePattern() != "" {
			route = rctx.RoutePattern()
		}
		span.SetAttributes(
			attribute.String("http.request.method", r.Method),
			attribute.String("http.route", route),
			attribute.Int("http.response.status_code", rec.status),
		)
		if userID := r.Header.Get("X-User-Id"); userID != "" {
			span.SetAttributes(attribute.String("user.id", userID))
		}
		if rec.status >= 500 {
			span.SetStatus(codes.Error, http.StatusText(rec.status))
		}
		span.End()
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
	status      int
	wroteHeader bool
}

func (r *statusRecorder) WriteHeader(code int) {
	if r.wroteHeader {
		return
	}
	r.wroteHeader = true
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(body []byte) (int, error) {
	if !r.wroteHeader {
		r.WriteHeader(http.StatusOK)
	}
	return r.ResponseWriter.Write(body)
}

func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

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
		if rec.status >= 500 {
			log.ErrorContext(r.Context(), "http request", args...)
			return
		}
		if dur >= slowRequestThreshold {
			log.WarnContext(r.Context(), "slow http request", args...)
			return
		}
		if debugRequest(r.Context()) {
			log.DebugContext(r.Context(), "http request debug", append(args, "query", r.URL.Query().Encode())...)
			return
		}
		if sampleAccessLog(r.URL.Path, RequestIDFromContext(r.Context())) {
			log.InfoContext(r.Context(), "http request", args...)
		}
	})
}

func sampleAccessLog(path, requestID string) bool {
	paths := os.Getenv("ACCESS_LOG_SAMPLE_PATHS")
	if paths == "" {
		paths = "/healthz,/readyz,/metrics"
	}
	highTraffic := false
	for _, candidate := range strings.Split(paths, ",") {
		if strings.TrimSpace(candidate) == path {
			highTraffic = true
			break
		}
	}
	if !highTraffic {
		return true
	}
	ratio, err := strconv.ParseFloat(os.Getenv("ACCESS_LOG_SAMPLE_RATE"), 64)
	if err != nil {
		ratio = 0.1
	}
	if ratio <= 0 {
		return false
	}
	if ratio >= 1 {
		return true
	}
	h := fnv.New32a()
	_, _ = h.Write([]byte(requestID))
	return float64(h.Sum32()%10_000) < ratio*10_000
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
