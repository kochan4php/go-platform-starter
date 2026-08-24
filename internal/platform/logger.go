// Package platform holds the shared building blocks every service uses:
// structured logging, fail-fast config loading, HTTP envelopes, the error
// taxonomy ported from the TypeScript era, middleware, graceful servers and
// health endpoints.
//
// It lives under internal/ so no external module can import it.
package platform

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
)

type loggerKey struct{}

var requestLoggerKey loggerKey

// NewLogger builds the service-wide JSON logger (pino parity: one line per
// event, level from LOG_LEVEL, unknown levels fall back to info).
func NewLogger(level string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl}))
}

// IntoContext binds a request-scoped logger to the context.
func IntoContext(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, requestLoggerKey, l)
}

// FromContext returns the request-scoped logger, or the default logger.
func FromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(requestLoggerKey).(*slog.Logger); ok {
		return l
	}
	return slog.Default()
}

// MustLoad parses environment variables into T (via `env:` struct tags) and
// exits the process with a readable report on failure — the Go twin of the
// TypeScript fail-fast config/env contract.
func MustLoad[T any](log *slog.Logger) *T {
	cfg, err := Load[T]()
	if err != nil {
		log.Error("invalid configuration — fix env and restart", "err", err)
		os.Exit(1)
	}
	return cfg
}

// Load is the non-exiting variant, exported for tests.
func Load[T any]() (*T, error) {
	cfg := new(T)
	if err := parseEnv(cfg); err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}
	return cfg, nil
}
