package platform

import (
	"log/slog"
	"os"
	"strconv"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// OpenDatabase applies the same prepared-statement cache and bounded pool to
// every service. Values remain environment-tunable for differently sized
// deployments without duplicating connection policy in each binary.
func OpenDatabase(dsn string, log *slog.Logger, slowThreshold time.Duration) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:      NewGormLogger(log, slowThreshold),
		PrepareStmt: envBool("DB_PREPARE_STMT", true),
	})
	if err != nil {
		return nil, err
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
