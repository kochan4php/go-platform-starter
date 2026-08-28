// Package platform provides shared runtime building blocks for every service:
// logging, env parsing, HTTP envelopes/errors/middleware, health probes,
// pagination, the GORM slog bridge, the redis-lock scheduler and the mailer.
package platform

import (
	"log/slog"
	"os"
	"os/signal"
	"strings"
	"syscall"
)

func NewLogger(level, serviceName string) *slog.Logger {
	var levelVar slog.LevelVar
	levelVar.Set(parseLogLevel(level))
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: &levelVar})
	log := slog.New(h).With("service", serviceName)
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGHUP)
	go func() {
		for range signals {
			levelVar.Set(parseLogLevel(os.Getenv("LOG_LEVEL")))
			log.Info("log level reloaded", "level", levelVar.Level())
		}
	}()
	return log
}

func parseLogLevel(level string) slog.Level {
	switch strings.ToLower(level) {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
