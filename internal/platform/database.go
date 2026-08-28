package platform

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// OpenDatabase applies the same prepared-statement cache and bounded pool to
// every service. Values remain environment-tunable for differently sized
// deployments without duplicating connection policy in each binary.
func OpenDatabase(dsn string, log *slog.Logger, slowThreshold time.Duration) (*gorm.DB, error) {
	dsn = databaseTimeouts(dsn)
	deadline := time.Now().Add(envDuration("DB_BOOT_RETRY_TIMEOUT", 30*time.Second))
	var db *gorm.DB
	var err error
	for attempt := 0; ; attempt++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger:      NewGormLogger(log, slowThreshold),
			PrepareStmt: envBool("DB_PREPARE_STMT", true),
		})
		if err == nil {
			if candidate, dbErr := db.DB(); dbErr != nil {
				err = dbErr
			} else {
				pingCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				err = candidate.PingContext(pingCtx)
				cancel()
				if err != nil {
					_ = candidate.Close()
				}
			}
		}
		if err == nil {
			break
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("database unavailable after boot retry: %w", err)
		}
		delay := min(time.Second<<min(attempt, 4), 5*time.Second) + time.Duration(rand.IntN(250))*time.Millisecond
		log.Warn("database connect failed; retrying", "attempt", attempt+1, "delay", delay, "err", err)
		time.Sleep(delay)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(envInt("DB_MAX_OPEN_CONNS", 16))
	sqlDB.SetMaxIdleConns(envInt("DB_MAX_IDLE_CONNS", 8))
	sqlDB.SetConnMaxLifetime(envDuration("DB_CONN_MAX_LIFETIME", 30*time.Minute))
	sqlDB.SetConnMaxIdleTime(envDuration("DB_CONN_MAX_IDLE_TIME", 5*time.Minute))
	return db, nil
}

func databaseTimeouts(dsn string) string {
	if !strings.HasPrefix(dsn, "postgres://") && !strings.HasPrefix(dsn, "postgresql://") {
		return dsn
	}
	u, err := url.Parse(dsn)
	if err != nil {
		return dsn
	}
	q := u.Query()
	if q.Get("statement_timeout") == "" {
		q.Set("statement_timeout", strconv.Itoa(int(envDuration("DB_STATEMENT_TIMEOUT", 15*time.Second).Milliseconds())))
	}
	if q.Get("idle_in_transaction_session_timeout") == "" {
		q.Set("idle_in_transaction_session_timeout", strconv.Itoa(int(envDuration("DB_IDLE_TX_TIMEOUT", 30*time.Second).Milliseconds())))
	}
	u.RawQuery = q.Encode()
	return u.String()
}

func envInt(name string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(name))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}

func envBool(name string, fallback bool) bool {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(name string, fallback time.Duration) time.Duration {
	value, err := time.ParseDuration(os.Getenv(name))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
