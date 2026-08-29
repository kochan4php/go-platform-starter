package testutil

import (
	"fmt"
	"io/fs"
	"strings"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

// AssertMigrationRoundTrip proves down/up reversibility and repeated no-op
// safety against an isolated test database.
func AssertMigrationRoundTrip(t *testing.T, databaseURL string, files fs.FS, table string) {
	t.Helper()
	source, err := iofs.New(files, ".")
	if err != nil {
		t.Fatal(err)
	}
	url := "postgres://" + strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(databaseURL, "postgres://"), "postgresql://"), "pgx5://")
	separator := "?"
	if strings.Contains(url, "?") {
		separator = "&"
	}
	m, err := migrate.NewWithSourceInstance("iofs", source, fmt.Sprintf("%s%sx-migrations-table=%s", url, separator, table))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = m.Close() })
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("first up: %v", err)
	}
	if err := m.Up(); err != migrate.ErrNoChange {
		t.Fatalf("second up = %v, want no change", err)
	}
	if err := m.Down(); err != nil {
		t.Fatalf("first down: %v", err)
	}
	if err := m.Down(); err != migrate.ErrNoChange {
		t.Fatalf("second down = %v, want no change", err)
	}
	if err := m.Up(); err != nil {
		t.Fatalf("up after rollback: %v", err)
	}
}
