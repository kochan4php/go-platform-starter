// Package internal implements the realtime WebSocket service: handshake JWT
// auth, allowlisted rooms with caps, broadcast, presence metrics and the
// redis force-logout kick bridge.
package internal

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
)

type Client struct {
	Conn  *websocket.Conn
	Sub   string
	Email string
	Rooms map[string]bool
	mu    sync.Mutex
}

func (c *Client) Send(ctx context.Context, msg map[string]any) {
	raw, err := jsonMarshal(msg)
	if err != nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	writeCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	_ = c.Conn.Write(writeCtx, websocket.MessageText, raw)
}

func (c *Client) Ping(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return c.Conn.Ping(pingCtx)
}

func (c *Client) InRoom(room string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Rooms[room]
}

type Hub struct {
	log         *slog.Logger
	mu          sync.RWMutex
	rooms       map[string]map[*Client]bool
	allowed     map[string]bool
	maxPerRoom  int
	connections prometheusGauge
}

func NewHub(log *slog.Logger, allowedRooms []string, maxPerRoom int, connections prometheusGauge) *Hub {
	allowed := make(map[string]bool, len(allowedRooms))
	for _, r := range allowedRooms {
		allowed[r] = true
	}
	if len(allowed) == 0 {
		allowed = map[string]bool{"lobby": true}
	}
	return &Hub{
		log: log.With("component", "hub"), rooms: map[string]map[*Client]bool{},
		allowed: allowed, maxPerRoom: maxPerRoom, connections: connections,
	}
}

var ErrRoomDenied = errString("room not allowed")
var ErrRoomFull = errString("room is full")

func (h *Hub) Join(ctx context.Context, c *Client, room string) error {
	if !h.allowed[room] {
		return ErrRoomDenied
	}
	h.mu.Lock()
	if h.rooms[room] == nil {
		h.rooms[room] = map[*Client]bool{}
	}
	if len(h.rooms[room]) >= h.maxPerRoom {
		h.mu.Unlock()
		return ErrRoomFull
	}
	h.rooms[room][c] = true
	c.mu.Lock()
	c.Rooms[room] = true
	c.mu.Unlock()
	members := len(h.rooms[room])
	h.mu.Unlock()

	h.connections.Set(float64(h.totalConns()))
	c.Send(ctx, map[string]any{"type": "room:joined", "room": room, "members": members})
	h.Broadcast(ctx, room, map[string]any{"type": "room:join", "room": room, "from": c.Sub}, c)
	return nil
}

func (h *Hub) Leave(ctx context.Context, c *Client, room string) {
	h.mu.Lock()
	if set := h.rooms[room]; set != nil {
		delete(set, c)
	}
	c.mu.Lock()
	delete(c.Rooms, room)
	c.mu.Unlock()
	h.mu.Unlock()
	c.Send(ctx, map[string]any{"type": "room:left", "room": room})
}

func (h *Hub) Broadcast(ctx context.Context, room string, msg map[string]any, except *Client) {
	h.mu.RLock()
	members := make([]*Client, 0, len(h.rooms[room]))
	for m := range h.rooms[room] {
		if m != except {
			members = append(members, m)
		}
	}
	h.mu.RUnlock()
	for _, m := range members {
		m.Send(ctx, msg)
	}
}

func (h *Hub) Disconnect(ctx context.Context, c *Client) {
	h.mu.Lock()
	c.mu.Lock()
	for room := range c.Rooms {
		if set := h.rooms[room]; set != nil {
			delete(set, c)
		}
	}
	c.mu.Unlock()
	total := h.totalConnsLocked()
	h.mu.Unlock()
	h.connections.Set(float64(total))
	_ = c.Conn.Close(websocket.StatusNormalClosure, "")
}

func (h *Hub) totalConns() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.totalConnsLocked()
}

func (h *Hub) totalConnsLocked() int {
	seen := map[*Client]bool{}
	for _, set := range h.rooms {
		for m := range set {
			seen[m] = true
		}
	}
	return len(seen)
}

func TokenFromHandshake(r *http.Request) (string, bool) {
	// Clients offer: Sec-WebSocket-Protocol: jwt,<accessToken>
	vals := r.Header.Values("Sec-Websocket-Protocol")
	for _, v := range vals {
		parts := strings.Split(v, ",")
		if len(parts) >= 2 && strings.TrimSpace(parts[0]) == "jwt" {
			return strings.TrimSpace(parts[1]), true
		}
	}
	return "", false
}
