package platform

import "context"

// AuditEvent is the payload emitted onto the audit.events stream. The worker
// is the sole writer of schema `audit` (single-schema-creds rule).
type AuditEvent struct {
	ActorSub string         `json:"actorSub"`
	Action   string         `json:"action"`
	Entity   string         `json:"entity"`
	EntityID string         `json:"entityId,omitempty"`
	Meta     map[string]any `json:"meta,omitempty"`
}

type StreamPublisher interface {
	Publish(ctx context.Context, stream, event string, payload any) error
}

const StreamAudit = "audit.events"

// Audit records a mutating action onto the audit stream; failures are logged,
// never fatal — auditing must not break the business path.
func Audit(ctx context.Context, pub StreamPublisher, log Loggerish, ev AuditEvent) {
	if err := pub.Publish(ctx, StreamAudit, "audit.entry", ev); err != nil {
		log.Warn("audit publish failed", "err", err)
	}
}

type Loggerish interface {
	Warn(msg string, args ...any)
}
