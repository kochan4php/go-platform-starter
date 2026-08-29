// Package testutil boots throwaway Postgres and Redis containers for
// integration tests. Tests skip automatically when no Docker daemon is
// reachable, keeping `go test ./...` green on machines without Docker.
package testutil

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/redis/go-redis/v9"
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
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		t.Fatalf("open postgres readiness probe: %v", err)
	}
	defer db.Close()
	deadline := time.Now().Add(20 * time.Second)
	for {
		err = db.PingContext(ctx)
		if err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("postgres never accepted a query: %v", err)
		}
		time.Sleep(250 * time.Millisecond)
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
	probe := redis.NewClient(&redis.Options{Addr: addr})
	defer probe.Close()
	deadline := time.Now().Add(20 * time.Second)
	for {
		err = probe.Ping(ctx).Err()
		if err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("redis never accepted a command: %v", err)
		}
		time.Sleep(250 * time.Millisecond)
	}
	return addr
}
