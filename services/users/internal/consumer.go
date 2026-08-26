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
				handleEvent(ctx, db, log, msg.Values["event"], msg.Values["payload"])
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
		// auth already created the identity row before publishing; this is a
		// safety net for events that raced a fresh database.
		if err := db.WithContext(ctx).Exec(
			`INSERT INTO users.users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, payload.Sub,
		).Error; err != nil {
			log.Error("materialize profile failed", "sub", payload.Sub, "err", err)
		} else {
			log.Info("profile materialized", "sub", payload.Sub)
		}
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
