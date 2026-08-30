package platform

import "testing"

func TestMigrationURLUsesServiceHistory(t *testing.T) {
	got := migrationURL("pgx5://app:secret@db/app?sslmode=disable", "users_migrations")
	want := "postgres://app:secret@db/app?sslmode=disable&x-migrations-table=users_migrations&lock_timeout=5000&statement_timeout=300000"
	if got != want {
		t.Fatalf("migrationURL() = %q, want %q", got, want)
	}
}
