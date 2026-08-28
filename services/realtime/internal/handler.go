package internal

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/coder/websocket"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

const wsProtocolVersion = "v1"

type Handlers struct {
	Hub        *Hub
	SecretRing string
	Log        *slog.Logger
}

// WS handles the upgrade: token via Sec-WebSocket-Protocol "jwt,<token>"
// (never a query param — PLAN item 41), then serves the room protocol.
func (h *Handlers) WS(w http.ResponseWriter, r *http.Request) {
	log := h.Log.With("component", "ws")

	raw, ok := TokenFromHandshake(r)
	if !ok {
		platform.Fail(w, http.StatusUnauthorized, "unauthorized", "offer subprotocol 'jwt,<accessToken>'")
		return
	}
	claims, err := platform.ParseAccessTokenRing(h.SecretRing, raw)
	if err != nil {
		platform.Fail(w, http.StatusUnauthorized, "unauthorized", "invalid access token")
		return
	}

	log.Info("handshake ok")
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		log.Warn("accept failed", "err", err)
		return
	}

	client := &Client{Conn: conn, Sub: claims.Sub, Email: claims.Email, Rooms: map[string]bool{}}
	log.Info("socket connected", "sub", client.Sub)

	h.serve(r.Context(), client)

	h.Disconnect(context.Background(), client)
	log.Info("socket disconnected", "sub", client.Sub)
}

func (h *Handlers) serve(reqCtx context.Context, c *Client) {
	ctx, cancel := context.WithCancel(reqCtx)
	defer cancel()

	for {
		_, raw, err := c.Conn.Read(ctx)
		if err != nil {
			return
		}
		var msg struct {
			Type string `json:"type"`
			Room string `json:"room"`
			Text string `json:"text"`
		}
		if json.Unmarshal(raw, &msg) != nil || msg.Type == "" {
			h.Log.Warn("malformed frame", "raw", string(raw))
			c.Send(ctx, map[string]any{"type": "error", "reason": "malformed message"})
			continue
		}

		switch msg.Type {
		case "room:join":
			if err := h.Join(ctx, c, msg.Room); err != nil {
				c.Send(ctx, map[string]any{"type": "error", "reason": err.Error()})
			}
		case "room:leave":
			h.Leave(ctx, c, msg.Room)
		case "message:send":
			if !c.Rooms[msg.Room] {
				c.Send(ctx, map[string]any{"type": "error", "reason": "join the room first"})
				continue
			}
			h.Broadcast(ctx, msg.Room, map[string]any{
				"type": "message", "room": msg.Room,
				"from": c.Sub, "text": msg.Text, "ts": time.Now().UnixMilli(),
			}, nil)
		default:
			c.Send(ctx, map[string]any{"type": "error", "reason": "unknown type"})
		}
		if ctx.Err() != nil {
			return
		}
	}
}

func contains(list []*Client, c *Client) bool {
	for _, x := range list {
		if x == c {
			return true
		}
	}
	return false
}

func (h *Handlers) Join(ctx context.Context, c *Client, room string) error {
	return h.Hub.Join(ctx, c, room)
}

func (h *Handlers) Leave(ctx context.Context, c *Client, room string) {
	h.Hub.Leave(ctx, c, room)
}

func (h *Handlers) Broadcast(ctx context.Context, room string, msg map[string]any, except *Client) {
	h.Hub.Broadcast(ctx, room, msg, except)
}

func (h *Handlers) Disconnect(ctx context.Context, c *Client) {
	h.Hub.Disconnect(ctx, c)
}

func NewHandlers(hub *Hub, secret []byte, log *slog.Logger) *Handlers {
	return NewHandlersWithKeyRing(hub, string(secret), log)
}

func NewHandlersWithKeyRing(hub *Hub, secretRing string, log *slog.Logger) *Handlers {
	return &Handlers{Hub: hub, SecretRing: secretRing, Log: log.With("service", "realtime")}
}
