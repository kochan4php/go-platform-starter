package platform

import (
	"bytes"
	"log/slog"
	"net"
	"strings"
	"sync"
	"testing"
	"time"
)

// lockedBuffer lets the test read what StartPprof's listener goroutine logs
// without racing it.
type lockedBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *lockedBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *lockedBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

func waitForLog(t *testing.T, logged *lockedBuffer, want string) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !strings.Contains(logged.String(), want) {
		if time.Now().After(deadline) {
			t.Fatalf("logged %q, want it to contain %q", logged.String(), want)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestStartPprofOnlyListensOnLoopback(t *testing.T) {
	for _, tc := range []struct {
		name string
		addr string
		want string
	}{
		{"empty address starts nothing", "", ""},
		{"routable address is refused", "0.0.0.0:6060", "pprof listener rejected"},
		{"malformed address is refused", "not-an-address", "pprof listener rejected"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			logged := &lockedBuffer{}
			StartPprof(tc.addr, slog.New(slog.NewTextHandler(logged, nil)))
			if tc.want == "" {
				if logged.String() != "" {
					t.Fatalf("expected silence, logged %q", logged.String())
				}
				return
			}
			waitForLog(t, logged, tc.want)
		})
	}
}

// Pointing StartPprof at a port something else already holds is the only way to
// watch the whole loopback path run to completion: the listener is accepted as
// loopback, announces itself, then fails to bind. Letting it listen on :0
// instead would leave ListenAndServe blocked for the rest of the package's
// tests, so whether its error branch ran at all would depend on timing — and
// coverage feeds a committed badge that CI compares byte for byte.
func TestStartPprofReportsAFailedBind(t *testing.T) {
	occupied, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer occupied.Close()

	logged := &lockedBuffer{}
	StartPprof(occupied.Addr().String(), slog.New(slog.NewTextHandler(logged, nil)))
	waitForLog(t, logged, "pprof listening")
	waitForLog(t, logged, "pprof listener stopped")
}
