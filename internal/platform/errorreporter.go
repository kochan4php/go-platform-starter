package platform

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	sentry "github.com/getsentry/sentry-go"
)

// ErrorReporter port (PLAN item 75): no-op by default; the Sentry adapter is
// enabled only when SENTRY_DSN is set. Call sites never know the difference.
type ErrorReporter interface {
	Report(ctx context.Context, err error, format string, args ...any)
}

type noopReporter struct{}

func (noopReporter) Report(context.Context, error, string, ...any) {}

var reporter ErrorReporter = noopReporter{}

// InitErrorReporter selects the adapter from the environment. Services call
// it once at boot; safe to call again (last writer wins).
func InitErrorReporter(log *slog.Logger) ErrorReporter {
	if dsn := os.Getenv("SENTRY_DSN"); dsn != "" {
		if err := sentry.Init(sentry.ClientOptions{Dsn: dsn}); err != nil {
			log.Error("sentry init failed — falling back to noop", "err", err)
			reporter = noopReporter{}
			return reporter
		}
		log.Info("sentry error reporting enabled")
		reporter = sentryReporter{}
		return reporter
	}
	log.Info("error reporting disabled", "reason", "SENTRY_DSN not set")
	return reporter
}

type sentryReporter struct{}

func (sentryReporter) Report(ctx context.Context, err error, format string, args ...any) {
	if err == nil {
		return
	}
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	hub.WithScope(func(scope *sentry.Scope) {
		scope.SetContext("detail", sentry.Context{"message": fmt.Sprintf(format, args...)})
		if id := RequestIDFromContext(ctx); id != "" {
			scope.SetTag("request_id", id)
		}
		if id := TraceIDFromContext(ctx); id != "" {
			scope.SetTag("trace_id", id)
		}
		hub.CaptureException(err)
	})
}

// ReportError routes through the active reporter; always safe on nil errors.
func ReportError(ctx context.Context, err error, format string, args ...any) {
	reporter.Report(ctx, err, format, args...)
}

// toError converts a recovered panic value into an error for reporters.
func toError(p any) error {
	switch v := p.(type) {
	case error:
		return v
	default:
		return fmt.Errorf("%v", v)
	}
}
