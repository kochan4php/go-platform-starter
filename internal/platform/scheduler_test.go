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

func TestDistributedLockOwnershipAndRenewal(t *testing.T) {
	addr := testutil.StartRedis(t)
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	defer rdb.Close()
	ctx := context.Background()
	first, acquired, err := TryDistributedLock(ctx, rdb, "lock:test", time.Second)
	if err != nil || !acquired {
		t.Fatalf("first acquire = %v, %v", acquired, err)
	}
	second, acquired, err := TryDistributedLock(ctx, rdb, "lock:test", time.Second)
	if err != nil || acquired {
		t.Fatalf("second acquire = %v, %v", acquired, err)
	}
	if renewed, err := first.Renew(ctx); err != nil || !renewed {
		t.Fatalf("renew = %v, %v", renewed, err)
	}
	if err := second.Release(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := rdb.Get(ctx, "lock:test").Result(); err != nil {
		t.Fatalf("foreign release removed lock: %v", err)
	}
	if err := first.Release(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestUserLifecycleTransitions(t *testing.T) {
	for _, transition := range [][2]UserStatus{{UserActive, UserInactive}, {UserInactive, UserActive}, {UserActive, UserDeleted}} {
		if err := ValidateUserTransition(transition[0], transition[1]); err != nil {
			t.Fatal(err)
		}
	}
	if err := ValidateUserTransition(UserDeleted, UserActive); err == nil {
		t.Fatal("deleted user became active")
	}
}

func TestLeaderElectionAllowsOneActiveLeader(t *testing.T) {
	addr := testutil.StartRedis(t)
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	defer rdb.Close()
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	ctx, cancel := context.WithCancel(context.Background())
	var active, maximum atomic.Int64
	started := make(chan struct{}, 2)
	callback := func(leaderCtx context.Context) {
		current := active.Add(1)
		for {
			old := maximum.Load()
			if current <= old || maximum.CompareAndSwap(old, current) {
				break
			}
		}
		started <- struct{}{}
		<-leaderCtx.Done()
		active.Add(-1)
	}
	done := make(chan struct{}, 2)
	for range 2 {
		go func() {
			NewLeaderElector(rdb, log, "test", 3*time.Second).Run(ctx, callback)
			done <- struct{}{}
		}()
	}
	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("no leader elected")
	}
	time.Sleep(250 * time.Millisecond)
	cancel()
	<-done
	<-done
	if maximum.Load() != 1 {
		t.Fatalf("simultaneous leaders = %d", maximum.Load())
	}
}
