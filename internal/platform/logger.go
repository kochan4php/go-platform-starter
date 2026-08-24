// Package platform provides shared runtime building blocks for every service:
// logging, env parsing, HTTP envelopes/errors/middleware, health probes,
// pagination, the GORM slog bridge, the redis-lock scheduler and the mailer.
package platform

import (
	"log/slog"
	"os"
	"strings"
)

func NewLogger(level, serviceName string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	return slog.New(h).With("service", serviceName)
}
