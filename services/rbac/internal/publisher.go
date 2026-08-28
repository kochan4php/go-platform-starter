package internal

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type RedisPublisher struct{ RDB *redis.Client }

func (p RedisPublisher) Publish(ctx context.Context, stream, event string, payload any) error {
	return platform.Publish(ctx, p.RDB, stream, event, payload)
}

func (p RedisPublisher) InvalidateClaims(ctx context.Context, userID, version int64) error {
	if err := p.RDB.Set(ctx, fmt.Sprintf("claims:ver:%d", userID), version, 0).Err(); err != nil {
		return err
	}
	return p.RDB.Publish(ctx, "force-logout", userID).Err()
}

// MigrateUp applies the embedded SQL pairs.
func MigrateUp(databaseURL string) error { return migrateUp(databaseURL) }
