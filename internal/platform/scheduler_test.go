package platform

import (
	"context"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/kochan4php/go-platform-starter/internal/testutil"
)

func TestSchedulerSingleRunnerAndPanicSafety(t *testing.T) {
	addr := testutil.StartRedis(t)
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	defer rdb.Close()

	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	var runs atomic.Int64

	// Another replica already holds the lock: this scheduler must skip.
	lockCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := rdb.SetNX(lockCtx, "scheduler:lock:sweep", "other-replica", time.Hour).Err(); err != nil {
		t.Fatal(err)
	}
	skipped := NewScheduler(rdb, log, 100*time.Millisecond, "sweep", func(context.Context) {
		runs.Add(1)
	})
	done := skipped.Start(lockCtx)
	time.Sleep(400 * time.Millisecond)
	cancel()
	<-done
	if n := runs.Load(); n != 0 {
		t.Fatalf("ran despite foreign lock: %d", n)
	}

	if err := rdb.Del(context.Background(), "scheduler:lock:sweep").Err(); err != nil {
		t.Fatal(err)
	}

	// Lock-free: it runs; a panicking tick must not kill the loop.
	s := NewScheduler(rdb, log, 50*time.Millisecond, "sweep", func(ctx context.Context) {
		if runs.Add(1) == 1 {
			panic("boom")
		}
	})
	ctx, stop := context.WithCancel(context.Background())
	done = s.Start(ctx)
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) && runs.Load() < 3 {
		time.Sleep(20 * time.Millisecond)
	}
	stop()
	<-done
	if runs.Load() < 3 {
		t.Fatalf("loop did not survive panic or stopped ticking: calls=%d", runs.Load())
	}
}
