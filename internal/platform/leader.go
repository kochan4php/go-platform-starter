package platform

import (
	"context"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

type LeaderElector struct {
	rdb *redis.Client
	log *slog.Logger
	key string
	ttl time.Duration
}

func NewLeaderElector(rdb *redis.Client, log *slog.Logger, name string, ttl time.Duration) *LeaderElector {
	if ttl < 3*time.Second {
		ttl = 15 * time.Second
	}
	return &LeaderElector{rdb: rdb, log: log, key: "leader:" + name, ttl: ttl}
}

// Run repeatedly campaigns for leadership. The callback is cancelled if the
// lease cannot be renewed, ensuring only the current owner keeps working.
func (e *LeaderElector) Run(ctx context.Context, callback func(context.Context)) {
	retry := time.NewTicker(e.ttl / 3)
	defer retry.Stop()
	for ctx.Err() == nil {
		lock, acquired, err := TryDistributedLock(ctx, e.rdb, e.key, e.ttl)
		if err != nil || !acquired {
			select {
			case <-ctx.Done():
				return
			case <-retry.C:
				continue
			}
		}
		e.log.Info("leadership acquired", "key", e.key)
		leaderCtx, cancel := context.WithCancel(ctx)
		done := make(chan struct{})
		go func() { defer close(done); callback(leaderCtx) }()
		renew := time.NewTicker(e.ttl / 3)
		leader := true
		for leader {
			select {
			case <-ctx.Done():
				leader = false
			case <-done:
				leader = false
			case <-renew.C:
				ok, renewErr := lock.Renew(ctx)
				if renewErr != nil || !ok {
					e.log.Warn("leadership lost", "key", e.key, "err", renewErr)
					leader = false
				}
			}
		}
		renew.Stop()
		cancel()
		<-done
		_ = lock.Release(context.WithoutCancel(ctx))
	}
}
