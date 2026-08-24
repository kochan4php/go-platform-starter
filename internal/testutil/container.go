// Package testutil boots throwaway Postgres and Redis containers for
// integration tests. Tests skip automatically when no Docker daemon is
// reachable, keeping `go test ./...` green on machines without Docker.
package testutil

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go/modules/postgres"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"

	mobyclient "github.com/moby/moby/client"
)

func dockerAvailable(ctx context.Context) bool {
	cli, err := mobyclient.NewClientWithOpts(mobyclient.FromEnv)
	if err != nil {
		return false
	}
	defer cli.Close()
	_, err = cli.Ping(ctx, mobyclient.PingOptions{})
	return err == nil
}

func requireDocker(t *testing.T) context.Context {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	t.Cleanup(cancel)
	if os.Getenv("TESTCONTAINERS_FORCE") == "" && !dockerAvailable(ctx) {
		t.Skip("docker daemon not reachable; skipping container test")
	}
	return ctx
}

func StartPostgres(t *testing.T) string {
	t.Helper()
	ctx := requireDocker(t)

	pgc, err := postgres.Run(ctx,
		"postgres:17-alpine",
		postgres.WithDatabase("app"),
		postgres.WithUsername("app"),
		postgres.WithPassword("app"),
	)
	if err != nil {
		t.Fatalf("start postgres: %v", err)
	}
	t.Cleanup(func() { _ = pgc.Terminate(context.WithoutCancel(ctx)) })

	dsn, err := pgc.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("postgres dsn: %v", err)
	}
	slog.Info("postgres container ready")
	return dsn
}

func StartRedis(t *testing.T) string {
	t.Helper()
	ctx := requireDocker(t)

	rc, err := tcredis.Run(ctx, "redis:7-alpine")
	if err != nil {
		t.Fatalf("start redis: %v", err)
	}
	t.Cleanup(func() { _ = rc.Terminate(context.WithoutCancel(ctx)) })

	addr, err := rc.Endpoint(ctx, "")
	if err != nil {
		t.Fatalf("redis endpoint: %v", err)
	}
	return addr
}
