// Command migrateall applies every service-owned schema to one database. It is
// intended for disposable CI/docs databases; production deploys migrate each
// service independently.
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	auth "github.com/kochan4php/go-platform-starter/services/auth/migrations"
	rbac "github.com/kochan4php/go-platform-starter/services/rbac/migrations"
	users "github.com/kochan4php/go-platform-starter/services/users/migrations"
	worker "github.com/kochan4php/go-platform-starter/services/worker/migrations"
)

func main() {
	databaseURL := flag.String("database-url", os.Getenv("DATABASE_URL"), "disposable PostgreSQL URL")
	flag.Parse()
	if *databaseURL == "" {
		fmt.Fprintln(os.Stderr, "migrateall: set DATABASE_URL or -database-url")
		os.Exit(2)
	}
	for _, migration := range []struct {
		name string
		run  func() error
	}{
		{"auth", func() error { return platform.Migrate(*databaseURL, auth.FS, "auth_migrations") }},
		{"users", func() error { return platform.Migrate(*databaseURL, users.FS, "users_migrations") }},
		{"rbac", func() error { return platform.Migrate(*databaseURL, rbac.FS, "rbac_migrations") }},
		{"worker", func() error { return platform.Migrate(*databaseURL, worker.FS, "worker_migrations") }},
	} {
		if err := migration.run(); err != nil {
			fmt.Fprintf(os.Stderr, "migrateall: %s: %v\n", migration.name, err)
			os.Exit(1)
		}
	}
	fmt.Println("all service migrations applied")
}
