package testutil_test

import (
	"context"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/testutil"
)

func TestPostgresHarnessBootsAndServesQueries(t *testing.T) {
	dsn := testutil.StartPostgres(t)

	var db *gorm.DB
	var err error
	deadline := time.Now().Add(20 * time.Second)
	for {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: platform.NewGormLogger(slog.New(slog.NewTextHandler(io.Discard, nil)), time.Second),
		})
		if err == nil {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("connect after retries: %v", err)
		}
		time.Sleep(500 * time.Millisecond)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()

	if err := db.Exec("SELECT 1").Error; err != nil {
		t.Fatalf("SELECT 1: %v", err)
	}
}

func TestRedisHarnessBootsAndServesLocks(t *testing.T) {
	addr := testutil.StartRedis(t)

	rdb := redis.NewClient(&redis.Options{Addr: addr})
	defer rdb.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	acquired, err := rdb.SetNX(ctx, "lock:test", "held", time.Minute).Result()
	if err != nil || !acquired {
		t.Fatalf("first SetNX: acquired=%v err=%v", acquired, err)
	}
	acquiredAgain, _ := rdb.SetNX(ctx, "lock:test", "held", time.Minute).Result()
	if acquiredAgain {
		t.Fatal("second SetNX must not acquire a held lock")
	}
}
