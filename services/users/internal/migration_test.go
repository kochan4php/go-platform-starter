package internal

import (
	"testing"

	"github.com/kochan4php/go-platform-starter/internal/testutil"
	migrations "github.com/kochan4php/go-platform-starter/services/users/migrations"
)

func TestMigrationsAreReversibleAndIdempotent(t *testing.T) {
	testutil.AssertMigrationRoundTrip(t, testutil.StartPostgres(t), migrations.FS, "users_migrations")
}
