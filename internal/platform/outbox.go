package platform

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// PublishWithAuditOutbox persists every domain event before attempting Redis.
// The historical name remains API-compatible; the worker relays any stream.
func PublishWithAuditOutbox(ctx context.Context, db *gorm.DB, rdb *redis.Client, stream, event string, payload any) error {
	if db == nil {
		return Publish(ctx, rdb, stream, event, payload)
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	id := "event-" + newRequestID()
	if audit, ok := payload.(AuditEvent); ok && audit.ID != "" {
		id = audit.ID
	}
	traceValues := map[string]any{}
	InjectTraceMap(ctx, traceValues)
	traceparent, _ := traceValues["traceparent"].(string)
	tracestate, _ := traceValues["tracestate"].(string)
	baggage, _ := traceValues["baggage"].(string)
	if err := db.WithContext(ctx).Exec(
		`INSERT INTO audit.event_outbox (id, stream, event, payload, traceparent, tracestate, baggage)
		 VALUES (?, ?, ?, ?::jsonb, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
		id, stream, event, string(raw), traceparent, tracestate, baggage).Error; err != nil {
		return fmt.Errorf("persist event outbox: %w", err)
	}
	if err := Publish(ctx, rdb, stream, event, json.RawMessage(raw)); err != nil {
		return nil // durable row is retried by the worker relay
	}
	return db.WithContext(context.WithoutCancel(ctx)).Exec(`DELETE FROM audit.event_outbox WHERE id = ?`, id).Error
}
