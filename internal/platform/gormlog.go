package platform

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

type GormLogger struct {
	Log           *slog.Logger
	SlowThreshold time.Duration
}

func NewGormLogger(log *slog.Logger, slowThreshold time.Duration) gormlogger.Interface {
	return &GormLogger{Log: log.With("component", "gorm"), SlowThreshold: slowThreshold}
}

func (l *GormLogger) LogMode(gormlogger.LogLevel) gormlogger.Interface { return l }

func (l *GormLogger) Info(_ context.Context, format string, a ...any) {
	l.Log.Info(fmt.Sprintf(format, a...))
}

func (l *GormLogger) Warn(_ context.Context, format string, a ...any) {
	l.Log.Warn(fmt.Sprintf(format, a...))
}

func (l *GormLogger) Error(_ context.Context, format string, a ...any) {
	l.Log.Error(fmt.Sprintf(format, a...))
}

func (l *GormLogger) Trace(_ context.Context, begin time.Time, fc func() (string, int64), err error) {
	elapsed := time.Since(begin)
	sql, rows := fc()
	log := l.Log.With("elapsed_ms", elapsed.Milliseconds(), "rows", rows)

	switch {
	case err != nil && !errors.Is(err, gorm.ErrRecordNotFound):
		log.Error("query failed", "err", err, "sql", sql)
	case l.SlowThreshold > 0 && elapsed > l.SlowThreshold:
		log.Warn("slow query", "threshold_ms", l.SlowThreshold.Milliseconds(), "sql", sql)
	default:
		log.Debug("query", "sql", sql)
	}
}
