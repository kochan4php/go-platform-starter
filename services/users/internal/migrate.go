package internal

import (
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	migrations "github.com/kochan4php/go-platform-starter/services/users/migrations"
)

func migrateUp(databaseURL string) error {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("migration source: %w", err)
	}
	m, err := migrate.NewWithSourceInstance("iofs", src, migrationURL(databaseURL))
	if err != nil {
		return fmt.Errorf("migrate init: %w", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

func trimScheme(u string) string {
	for _, p := range []string{"postgres://", "postgresql://", "pgx5://"} {
		if len(u) >= len(p) && u[:len(p)] == p {
			return u[len(p):]
		}
	}
	return u
}

// migrationURL points golang-migrate at this service's own history table so
// co-located services on one cluster never clobber each other's versions.
func migrationURL(databaseURL string) string {
	u := "postgres://" + trimScheme(databaseURL)
	sep := "?"
	if strings.Contains(u, "?") {
		sep = "&"
	}
	return u + sep + "x-migrations-table=users_migrations"
}
