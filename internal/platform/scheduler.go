package platform

import (
	"context"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// Scheduler runs named housekeeping jobs on a ticker. Across replicas only the
// redis-lock holder executes each tick; the lock TTL covers two intervals so a
// dead leader's lock expires before the next tick needs it.
type Scheduler struct {
	rdb      *redis.Client
	log      *slog.Logger
	interval time.Duration
	name     string
	fn       func(ctx context.Context)
}

func NewScheduler(rdb *redis.Client, log *slog.Logger, interval time.Duration, name string, fn func(ctx context.Context)) *Scheduler {
	return &Scheduler{rdb: rdb, log: log.With("job", name), interval: interval, name: name, fn: fn}
}

func (s *Scheduler) Start(ctx context.Context) <-chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()
		s.tryRun(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.tryRun(ctx)
			}
		}
	}()
	return done
}

func (s *Scheduler) tryRun(ctx context.Context) {
	lockKey := "scheduler:lock:" + s.name
	ttl := 2 * s.interval

	acquired, err := s.rdb.SetNX(ctx, lockKey, "held", ttl).Result()
	if err != nil {
		s.log.Error("lock check failed, skipping tick", "err", err)
		return
	}
	if !acquired {
		s.log.Debug("another replica holds the lock, skipping tick")
		return
	}

	runCtx, cancel := context.WithTimeout(ctx, s.interval)
	defer cancel()
	start := time.Now()
	func() {
		defer func() {
			if p := recover(); p != nil {
				s.log.Error("job panicked", "panic", p)
			}
		}()
		s.fn(runCtx)
	}()
	s.log.Info("job ran", "duration_ms", time.Since(start).Milliseconds())
}
