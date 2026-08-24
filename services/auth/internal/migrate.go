package internal

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	migrations "github.com/kochan4php/go-platform-starter/services/auth/migrations"
)

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func MigrateUp(databaseURL string) error {
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

// trimScheme converts a postgres:// URL into the form golang-migrate's
// database/postgres driver expects (it re-adds its own scheme prefix).
func trimScheme(databaseURL string) string {
	for _, p := range []string{"postgres://", "postgresql://", "pgx5://"} {
		if len(databaseURL) >= len(p) && databaseURL[:len(p)] == p {
			return databaseURL[len(p):]
		}
	}
	return databaseURL
}

// migrationURL points golang-migrate at this service's own history table so
// co-located services on one cluster never clobber each other's versions.
func migrationURL(databaseURL string) string {
	u := "postgres://" + trimScheme(databaseURL)
	sep := "?"
	if strings.Contains(u, "?") {
		sep = "&"
	}
	return u + sep + "x-migrations-table=auth_migrations"
}
