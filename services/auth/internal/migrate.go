package internal

import (
	"github.com/kochan4php/go-platform-starter/internal/platform"
	migrations "github.com/kochan4php/go-platform-starter/services/auth/migrations"
)

func MigrateUp(databaseURL string) error {
	return platform.Migrate(databaseURL, migrations.FS, "auth_migrations")
}
