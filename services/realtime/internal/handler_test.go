package internal

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/kochan4php/go-platform-starter/internal/testutil"
)

const testSecret = "realtime-test-secret-16ch!"

func mint(t *testing.T, sub string) string {
	t.Helper()
	token := jwtMintForTest(t, sub)
	return token
}

func dialWS(t *testing.T, srv *httptest.Server, token string) (*websocket.Conn, *http.Response) {
	t.Helper()
	url := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)
	conn, res, err := websocket.Dial(ctx, url, &websocket.DialOptions{
		HTTPHeader: http.Header{"Sec-Websocket-Protocol": []string{"jwt," + token}},
	})
	if err != nil {
		status := 0
		if res != nil {
			status = res.StatusCode
			b := make([]byte, 200)
			n, _ := res.Body.Read(b)
			t.Logf("dial failed status=%d body=%s", status, string(b[:n]))
		}
		t.Fatalf("dial: %v", err)
	}
	return conn, res
}

func readMsg(t *testing.T, conn *websocket.Conn) map[string]any {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, raw, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var m map[string]any
	if err := jsonUnmarshal(raw, &m); err != nil {
		t.Fatalf("decode %s: %v", raw, err)
	}
	return m
}

func send(conn *websocket.Conn, payload string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = conn.Write(ctx, websocket.MessageText, []byte(payload))
}

func TestRoomsBroadcastDenyAndForceLogoutKick(t *testing.T) {
	addr := testutil.StartRedis(t)
	log := slog.Default()

	gauge := prometheus.NewGauge(prometheus.GaugeOpts{Name: "rt_test_connections"})
	hub := NewHub(log, []string{"lobby"}, 5, gauge)
	rdb := newTestRedis(addr)
	hub.Kick(context.Background(), rdb)

	h := NewHandlers(hub, []byte(testSecret), log)
	srv := httptest.NewServer(http.HandlerFunc(h.WS))
	t.Cleanup(srv.Close)

	c1, _ := dialWS(t, srv, mint(t, "sub-1"))
	defer c1.Close(websocket.StatusNormalClosure, "")
	c2, _ := dialWS(t, srv, mint(t, "sub-2"))
	defer c2.Close(websocket.StatusNormalClosure, "")

	// handshake rejects missing/invalid token
	badURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/ws"
	ctxShort, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if _, _, err := websocket.Dial(ctxShort, badURL, nil); err == nil {
		t.Fatal("dial without subprotocol must be rejected")
	}

	// deny non-allowlisted room
	send(c1, `{"type":"room:join","room":"secret"}`)
	msg := readMsg(t, c1)
	if msg["type"] != "error" {
		t.Fatalf("expected error frame, got %+v", msg)
	}

	// both join lobby
	send(c1, `{"type":"room:join","room":"lobby"}`)
	if got := readMsg(t, c1); got["type"] != "room:joined" {
		t.Fatalf("c1 join: %+v", got)
	}
	send(c2, `{"type":"room:join","room":"lobby"}`)
	if got := readMsg(t, c2); got["type"] != "room:joined" {
		t.Fatalf("c2 join: %+v", got)
	}

	// c1 also receives the join notification about c2
	ev := readMsg(t, c1)
	if ev["type"] != "room:join" || fmt.Sprint(ev["from"]) != "sub-2" {
		t.Fatalf("c1 presence event: %+v", ev)
	}

	// c2 sends, c1 receives broadcast
	send(c2, `{"type":"message:send","room":"lobby","text":"hello"}`)
	got := readMsg(t, c1)
	if got["type"] != "message" || got["text"] != "hello" || fmt.Sprint(got["from"]) != "sub-2" {
		t.Fatalf("broadcast: %+v", got)
	}

	// force-logout kick for sub-2 closes its socket
	if err := rdb.Publish(context.Background(), "force-logout", "sub-2").Err(); err != nil {
		t.Fatal(err)
	}
	kickCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for {
		if _, _, err := c2.Read(kickCtx); err != nil {
			break // closed as expected
		}
	}
}
