package platform

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"strings"
	"time"
)

const requestIDHeader = "X-Request-ID"

type ctxKey int

const requestIDKey ctxKey = 1

var errRecovered = fmt.Errorf("handler panic")

func debugStack() []byte {
	return debug.Stack()
}

// Chain composes middleware around a handler (first = outermost).
func Chain(middlewares ...func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}

// newUUID mints an RFC-4122-shaped v4 UUID without external dependencies.
func newUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10
	dst := make([]byte, 36)
	hex.Encode(dst[0:8], b[0:4])
	dst[8] = '-'
	hex.Encode(dst[9:13], b[4:6])
	dst[13] = '-'
	hex.Encode(dst[14:18], b[6:8])
	dst[18] = '-'
	hex.Encode(dst[19:23], b[8:10])
	dst[23] = '-'
	hex.Encode(dst[24:36], b[10:16])
	return string(dst)
}

// RequestID echoes an incoming X-Request-ID or mints one, sets it on the
// response, binds the request-scoped logger into context, and records the id
// for handlers via RequestIDFromContext. Parity with pino-http genReqId.
func RequestLogger(logger *slog.Logger, ignorePrefixes ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := strings.TrimSpace(r.Header.Get(requestIDHeader))
			if id == "" {
				id = newUUID()
			}
			w.Header().Set(requestIDHeader, id)

			reqLog := logger.With("requestId", id)
			ctx := IntoContext(r.Context(), reqLog)
			ctx = context.WithValue(ctx, requestIDKey, id)

			start := time.Now()
			sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

			skip := false
			for _, prefix := range ignorePrefixes {
				if strings.HasPrefix(r.URL.Path, prefix) {
					skip = true
					break
				}
			}
			if !skip {
				defer func() {
					reqLog.Info("http request",
						"method", r.Method,
						"path", r.URL.Path,
						"status", sw.status,
						"durationMs", time.Since(start).Milliseconds(),
					)
				}()
			}

			next.ServeHTTP(sw, r.WithContext(ctx))
		})
	}
}

// Recover converts handler panics into opaque 500 envelopes — stack traces stay
// in logs, never in responses (legacy error-middleware parity).
func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger.Error("panic recovered", "panic", rec, "stack", string(debugStack()))
					WriteAppError(w, r.Context(), NewInternal(errRecovered))
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// RequestIDFromContext returns the correlation id assigned by RequestLogger.
func RequestIDFromContext(ctx context.Context) string {
	if id, ok := ctx.Value(requestIDKey).(string); ok {
		return id
	}
	return ""
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}
