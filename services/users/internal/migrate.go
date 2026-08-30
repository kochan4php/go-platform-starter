package internal

import (
	"github.com/kochan4php/go-platform-starter/internal/platform"
	migrations "github.com/kochan4php/go-platform-starter/services/users/migrations"
)

func migrateUp(databaseURL string) error {
	return platform.Migrate(databaseURL, migrations.FS, "users_migrations")
}
