package internal

import (
	"context"

	"github.com/coder/websocket"
	"github.com/redis/go-redis/v9"
)

// Kick subscribes to the auth force-logout channel and closes matching
// sockets (PLAN item 45).
func (h *Hub) Kick(ctx context.Context, rdb *redis.Client) {
	sub := rdb.Subscribe(ctx, "force-logout")
	go func() {
		for m := range sub.Channel() {
			target := m.Payload
			h.mu.RLock()
			var victims []*Client
			for _, set := range h.rooms {
				for c := range set {
					if c.Sub == target {
						victims = append(victims, c)
					}
				}
			}
			h.mu.RUnlock()
			for _, v := range victims {
				h.log.Info("force-logout kick", "sub", target)
				_ = v.Conn.Close(websocket.StatusPolicyViolation, "logged out")
			}
		}
	}()
}
