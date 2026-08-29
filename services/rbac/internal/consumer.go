package internal

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

// AssignDefaultRole is the idempotent RBAC step of the registration saga.
func AssignDefaultRole(ctx context.Context, db *gorm.DB, event platform.UserCreatedEvent) error {
	userID, err := strconv.ParseInt(event.Sub, 10, 64)
	if err != nil || userID <= 0 {
		return platform.ErrBadRequest("invalid user subject %q", event.Sub)
	}
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var roleID int64
		if err := tx.Raw(`INSERT INTO rbac.roles (name, description, color, icon)
			VALUES ('user', 'default registered-user role', '#2563eb', 'user')
			ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`).Scan(&roleID).Error; err != nil {
			return err
		}
		if err := tx.Exec(`INSERT INTO rbac.user_versions (user_id, ver) VALUES (?, 1)
			ON CONFLICT (user_id) DO NOTHING`, userID).Error; err != nil {
			return err
		}
		return tx.Exec(`INSERT INTO rbac.user_roles (user_id, role_id, ver) VALUES (?, ?, 1)
			ON CONFLICT (user_id, role_id) DO NOTHING`, userID, roleID).Error
	})
}

// ConsumeUserEvents completes the registration saga from the beginning of the
// stream, so a new deployment can rebuild missing default-role assignments.
func ConsumeUserEvents(ctx context.Context, rdb *redis.Client, db *gorm.DB, log *slog.Logger) {
	const group = "rbac-default-role"
	if err := rdb.XGroupCreateMkStream(ctx, platform.StreamUsers, group, "0").Err(); err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		log.Error("create user event group failed", "err", err)
		return
	}
	for ctx.Err() == nil {
		streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group: group, Consumer: "default-role", Streams: []string{platform.StreamUsers, ">"}, Count: 20, Block: 5 * time.Second,
		}).Result()
		if errors.Is(err, redis.Nil) {
			continue
		}
		if err != nil {
			if ctx.Err() == nil {
				log.Error("read user events failed", "err", err)
				time.Sleep(time.Second)
			}
			continue
		}
		for _, stream := range streams {
			for _, message := range stream.Messages {
				event, raw, decodeErr := platform.DecodeStreamMessage(platform.StreamUsers, message.Values)
				if decodeErr != nil || event != platform.EventUserCreated {
					_ = rdb.XAck(ctx, platform.StreamUsers, group, message.ID).Err()
					continue
				}
				var payload platform.UserCreatedEvent
				if err := json.Unmarshal([]byte(raw), &payload); err != nil {
					log.Warn("malformed user.created ignored", "message_id", message.ID, "err", err)
					_ = rdb.XAck(ctx, platform.StreamUsers, group, message.ID).Err()
					continue
				}
				if err := AssignDefaultRole(ctx, db, payload); err != nil {
					log.Error("default role assignment failed", "sub", payload.Sub, "err", err)
					continue
				}
				_ = rdb.XAck(ctx, platform.StreamUsers, group, message.ID).Err()
			}
		}
	}
}
