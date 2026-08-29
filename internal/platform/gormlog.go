package platform

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

var dbQueryDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
	Name:    "db_query_duration_seconds",
	Help:    "Database query latency grouped by stable operation name.",
	Buckets: prometheus.DefBuckets,
}, []string{"query_name"})

func init() { prometheus.MustRegister(dbQueryDuration) }

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

func (l *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	elapsed := time.Since(begin)
	sql, rows := fc()
	dbQueryDuration.WithLabelValues(queryOperation(sql)).Observe(elapsed.Seconds())
	log := l.Log.With("elapsed_ms", elapsed.Milliseconds(), "rows", rows)

	switch {
	case err != nil && !errors.Is(err, gorm.ErrRecordNotFound):
		log.ErrorContext(ctx, "query failed", "err", err, "sql", sql)
	case l.SlowThreshold > 0 && elapsed > l.SlowThreshold:
		if slowQuerySampled() {
			log.WarnContext(ctx, "slow query", "threshold_ms", l.SlowThreshold.Milliseconds(), "sql", sql)
		}
	default:
		log.DebugContext(ctx, "query", "sql", sql)
	}
}

func slowQuerySampled() bool {
	ratio, err := strconv.ParseFloat(os.Getenv("SLOW_QUERY_SAMPLE_RATE"), 64)
	if err != nil {
		ratio = 1
	}
	return ratio >= 1 || (ratio > 0 && rand.Float64() < ratio)
}

// queryOperation intentionally keeps cardinality bounded. SQL text, table
// names, and user values must never become metric labels.
func queryOperation(sql string) string {
	lower := strings.ToLower(sql)
	fields := strings.Fields(lower)
	if len(fields) == 0 {
		return "other"
	}
	operation := strings.ToLower(fields[0])
	switch operation {
	case "select", "insert", "update", "delete":
		for _, table := range []struct{ match, name string }{
			{"users.users", "users"}, {"auth.sessions", "sessions"},
			{"rbac.roles", "roles"}, {"rbac.permissions", "permissions"},
			{"rbac.user_roles", "user_roles"}, {"rbac.role_permissions", "role_permissions"},
			{"audit.audit_logs", "audit_logs"},
		} {
			if strings.Contains(lower, table.match) {
				return operation + "." + table.name
			}
		}
		return operation + ".other"
	default:
		return "other"
	}
}
