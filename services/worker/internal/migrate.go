package internal

import (
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"strings"

	migrations "github.com/kochan4php/go-platform-starter/services/worker/migrations"
)

func MigrateUp(databaseURL string) error {
	src, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return err
	}
	m, err := migrate.NewWithSourceInstance("iofs", src, migrationURL(databaseURL))
	if err != nil {
		return err
	}
	defer m.Close()
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return err
	}
	return nil
}

func migrationURL(databaseURL string) string {
	u := "postgres://" + trimScheme(databaseURL)
	sep := "?"
	if strings.Contains(u, "?") {
		sep = "&"
	}
	return u + sep + "x-migrations-table=worker_migrations"
}

func trimScheme(u string) string {
	for _, p := range []string{"postgres://", "postgresql://", "pgx5://"} {
		if len(u) >= len(p) && u[:len(p)] == p {
			return u[len(p):]
		}
	}
	return u
}
