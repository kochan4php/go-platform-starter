package platform

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// PublishWithAuditOutbox persists audit events before attempting Redis. A
// Redis outage therefore delays audit delivery instead of losing it.
func PublishWithAuditOutbox(ctx context.Context, db *gorm.DB, rdb *redis.Client, stream, event string, payload any) error {
	if stream != StreamAudit {
		return Publish(ctx, rdb, stream, event, payload)
	}
	if db == nil {
		return Publish(ctx, rdb, stream, event, payload)
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	id := "audit-" + newRequestID()
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
		if publishErr := Publish(ctx, rdb, stream, event, json.RawMessage(raw)); publishErr == nil {
			return nil
		}
		return fmt.Errorf("persist audit outbox: %w", err)
	}
	if err := Publish(ctx, rdb, stream, event, json.RawMessage(raw)); err != nil {
		return nil // durable row is retried by the worker relay
	}
	return db.WithContext(context.WithoutCancel(ctx)).Exec(`DELETE FROM audit.event_outbox WHERE id = ?`, id).Error
}
