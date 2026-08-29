// Package platform provides shared runtime building blocks for every service:
// logging, env parsing, HTTP envelopes/errors/middleware, health probes,
// pagination, the GORM slog bridge, the redis-lock scheduler and the mailer.
package platform

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"syscall"
)

var emailPattern = regexp.MustCompile(`(?i)([a-z0-9._%+\-])[a-z0-9._%+\-]*@([a-z0-9.\-]+\.[a-z]{2,})`)

type contextLevelHandler struct {
	slog.Handler
	level *slog.LevelVar
}

func (h *contextLevelHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return debugRequest(ctx) || level >= h.level.Level()
}

func (h *contextLevelHandler) Handle(ctx context.Context, record slog.Record) error {
	record.Message = maskPII(record.Message)
	logEvents.WithLabelValues(levelName(record.Level)).Inc()
	return h.Handler.Handle(ctx, record)
}

func (h *contextLevelHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &contextLevelHandler{Handler: h.Handler.WithAttrs(attrs), level: h.level}
}

func (h *contextLevelHandler) WithGroup(name string) slog.Handler {
	return &contextLevelHandler{Handler: h.Handler.WithGroup(name), level: h.level}
}

func NewLogger(level, serviceName string) *slog.Logger {
	var levelVar slog.LevelVar
	levelVar.Set(parseLogLevel(level))
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{ReplaceAttr: scrubLogAttr})
	log := slog.New(&contextLevelHandler{Handler: h, level: &levelVar}).With("service", serviceName)
	recordBuildInfo(serviceName)
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

func scrubLogAttr(_ []string, attr slog.Attr) slog.Attr {
	switch attr.Value.Kind() {
	case slog.KindString:
		attr.Value = slog.StringValue(maskPII(attr.Value.String()))
	case slog.KindAny:
		switch value := attr.Value.Any().(type) {
		case error:
			attr.Value = slog.StringValue(maskPII(value.Error()))
		case fmt.Stringer:
			attr.Value = slog.StringValue(maskPII(value.String()))
		}
	}
	return attr
}

func maskPII(value string) string {
	return emailPattern.ReplaceAllString(value, "$1***@$2")
}

func levelName(level slog.Level) string {
	switch {
	case level >= slog.LevelError:
		return "error"
	case level >= slog.LevelWarn:
		return "warn"
	case level >= slog.LevelInfo:
		return "info"
	default:
		return "debug"
	}
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
