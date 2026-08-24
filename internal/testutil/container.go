package testutil

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	tcredis "github.com/testcontainers/testcontainers-go/modules/redis"
	"github.com/testcontainers/testcontainers-go/wait"
)

// Stack holds the infrastructure a service's integration tests need.
type Stack struct {
	PostgresDSN string // postgresql://user:pass@host:port/db?sslmode=disable
	RedisAddr   string // host:port
	cleanup     []func()
}

// StartStack boots one Postgres + one Redis container for the calling test.
// Containers die with the test via t.Cleanup — no orphaned docker state.
func StartStack(t *testing.T) *Stack {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	t.Cleanup(cancel)

	pg, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        "postgres:16-alpine",
			Env:          map[string]string{"POSTGRES_USER": "test", "POSTGRES_PASSWORD": "test", "POSTGRES_DB": "test"},
			ExposedPorts: []string{"5432/tcp"},
			WaitingFor:   wait.ForListeningPort("5432/tcp").WithStartupTimeout(90 * time.Second),
		},
		Started: true,
	})
	requireNoError(t, err)

	rd, err := tcredis.Run(ctx, "redis:7-alpine")
	requireNoError(t, err)

	t.Cleanup(func() {
		_ = pg.Terminate(context.Background())
		_ = rd.Terminate(context.Background())
	})

	host, _ := pg.Host(ctx)
	port, _ := pg.MappedPort(ctx, "5432/tcp")
	dsn := fmt.Sprintf("postgresql://test:test@%s:%s/test?sslmode=disable", host, port.Port())

	redisHost, _ := rd.Host(ctx)
	redisPort, _ := rd.MappedPort(ctx, "6379/tcp")

	return &Stack{
		PostgresDSN: dsn,
		RedisAddr:   fmt.Sprintf("%s:%s", redisHost, redisPort.Port()),
	}
}

func requireNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("testcontainer startup failed: %v", err)
	}
}
