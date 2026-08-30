package platform

import (
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

// Migrate applies one service's embedded migration history and records its
// duration. MIGRATION_WARN_AFTER turns slow migrations into an explicit alert
// without making a completed schema change look failed.
func Migrate(databaseURL string, files fs.FS, table string) error {
	started := time.Now()
	source, err := iofs.New(files, ".")
	if err != nil {
		return fmt.Errorf("migration source: %w", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, migrationURL(databaseURL, table))
	if err != nil {
		return fmt.Errorf("migrate init: %w", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}
	duration := time.Since(started)
	fields := []any{"table", table, "duration", duration}
	if warnAfter, err := time.ParseDuration(os.Getenv("MIGRATION_WARN_AFTER")); err == nil && warnAfter > 0 && duration > warnAfter {
		slog.Warn("migration duration budget exceeded", append(fields, "budget", warnAfter)...)
	} else {
		slog.Info("migrations complete", fields...)
	}
	return nil
}

func migrationURL(databaseURL, table string) string {
	for _, prefix := range []string{"postgres://", "postgresql://", "pgx5://"} {
		databaseURL = strings.TrimPrefix(databaseURL, prefix)
	}
	separator := "?"
	if strings.Contains(databaseURL, "?") {
		separator = "&"
	}
	return "postgres://" + databaseURL + separator + "x-migrations-table=" + table + "&lock_timeout=5000&statement_timeout=300000"
}
