package platform

import (
	"context"
	"encoding/json"

	"github.com/redis/go-redis/v9"
)

// Publish writes a domain event to a Redis Stream. Payloads are JSON-encoded
// once here; consumers own their decoding. Streams used by the platform:
//
//	users.events  — user.created / user.deleted (see docs/CONTRACTS.md)
//	mail.jobs     — email.send jobs consumed by the worker
//	audit.events  — audit trail entries flushed by the worker
func Publish(ctx context.Context, rdb *redis.Client, stream, event string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: map[string]any{"event": event, "payload": string(raw)},
	}).Err()
}
