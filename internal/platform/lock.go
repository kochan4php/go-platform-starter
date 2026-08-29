package platform

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// DistributedLock is an ownership-safe Redis lease. Release and Renew use a
// compare-and-act script so an expired lease can never unlock a new owner.
type DistributedLock struct {
	rdb   *redis.Client
	key   string
	owner string
	ttl   time.Duration
}

func TryDistributedLock(ctx context.Context, rdb *redis.Client, key string, ttl time.Duration) (*DistributedLock, bool, error) {
	lock := &DistributedLock{rdb: rdb, key: key, owner: uuid.NewString(), ttl: ttl}
	ok, err := rdb.SetNX(ctx, key, lock.owner, ttl).Result()
	return lock, ok, err
}

func (l *DistributedLock) Renew(ctx context.Context) (bool, error) {
	const script = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end`
	result, err := l.rdb.Eval(ctx, script, []string{l.key}, l.owner, l.ttl.Milliseconds()).Int64()
	return result == 1, err
}

func (l *DistributedLock) Release(ctx context.Context) error {
	const script = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`
	return l.rdb.Eval(ctx, script, []string{l.key}, l.owner).Err()
}
