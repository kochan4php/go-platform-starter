package internal

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

const (
	StreamUsers  = "users.events"
	EventCreated = "user.created"
	EventDeleted = "user.deleted"
)

// ConsumeUserEvents materializes/deletes profile rows from the auth lifecycle
// stream. The group reads from the beginning of the stream so registrations
// made before this consumer's first deploy backfill (PLAN item 23).
func ConsumeUserEvents(ctx context.Context, rdb *redis.Client, db *gorm.DB, log *slog.Logger) {
	const (
		stream   = StreamUsers
		group    = "users-profile"
		consumer = "profiles"
	)

	err := rdb.XGroupCreateMkStream(ctx, stream, group, "0").Err()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		log.Error("create group failed", "err", err)
		return
	}

	for {
		res, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    group,
			Consumer: consumer,
			Streams:  []string{stream, ">"},
			Block:    5 * time.Second,
			Count:    10,
		}).Result()
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			if errors.Is(err, redis.Nil) {
				continue // block window elapsed with no data — normal
			}
			log.Error("xreadgroup failed", "err", err)
			time.Sleep(time.Second)
			continue
		}

		for _, s := range res {
			for _, msg := range s.Messages {
				event, payload, decodeErr := platform.DecodeStreamMessage(stream, msg.Values)
				if decodeErr != nil {
					log.Warn("invalid user event ignored", "err", decodeErr)
					_ = rdb.XAdd(ctx, &redis.XAddArgs{Stream: stream + ":dlq", Values: map[string]any{
						"reason": decodeErr.Error(), "orig_id": msg.ID,
					}, MaxLen: 10_000, Approx: true}).Err()
					rdb.XAck(ctx, stream, group, msg.ID)
					continue
				}
				handleEvent(ctx, db, log, event, payload)
				rdb.XAck(ctx, stream, group, msg.ID)
			}
		}
		if ctx.Err() != nil {
			return
		}
	}
}

func handleEvent(ctx context.Context, db *gorm.DB, log *slog.Logger, eventRaw, payloadRaw any) {
	event, _ := eventRaw.(string)
	payloadStr, _ := payloadRaw.(string)
	var payload struct {
		Sub string `json:"sub"`
	}
	if err := json.Unmarshal([]byte(payloadStr), &payload); err != nil || payload.Sub == "" {
		log.Warn("malformed user event ignored", "event", event)
		return
	}

	switch event {
	case EventCreated:
		// The identity transaction creates the profile columns in users.users
		// before publishing this notification, so no second write is needed.
		log.Info("profile available", "sub", payload.Sub)
	case EventDeleted:
		if err := db.WithContext(ctx).Exec(`DELETE FROM users.users WHERE id = ?`, payload.Sub).Error; err != nil {
			log.Error("profile purge failed", "sub", payload.Sub, "err", err)
		} else {
			log.Info("profile purged", "sub", payload.Sub)
		}
	default:
		log.Warn("unknown user event ignored", "event", event)
	}
}
