package platform

import "time"

const (
	StreamUsers      = "users.events"
	EventUserCreated = "user.created"
	EventUserDeleted = "user.deleted"
)

// UserCreatedEvent is the event-carried user snapshot consumed by profile and
// RBAC read models. Adding fields is backward-compatible because consumers use
// JSON decoding.
type UserCreatedEvent struct {
	Sub         string `json:"sub"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
}

type UserDeletedEvent struct {
	Sub string `json:"sub"`
}

type ScheduledEvent struct {
	Name        string         `json:"name"`
	ScheduledAt time.Time      `json:"scheduledAt"`
	Payload     map[string]any `json:"payload,omitempty"`
}
