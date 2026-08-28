package internal

import (
	"context"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type RedisPublisher struct {
	RDB *redis.Client
	DB  *gorm.DB
}

func (p RedisPublisher) Publish(ctx context.Context, stream, event string, payload any) error {
	return platform.PublishWithAuditOutbox(ctx, p.DB, p.RDB, stream, event, payload)
}

// MigrateUp applies the embedded SQL pairs.
func MigrateUp(databaseURL string) error { return migrateUp(databaseURL) }
