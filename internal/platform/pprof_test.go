package platform

import (
	"bytes"
	"log/slog"
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

func TestStartPprofOnlyListensOnLoopback(t *testing.T) {
	for _, tc := range []struct {
		name string
		addr string
		want string
	}{
		{"empty address starts nothing", "", ""},
		{"loopback starts the listener", "127.0.0.1:0", "pprof listening"},
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
			deadline := time.Now().Add(5 * time.Second)
			for !strings.Contains(logged.String(), tc.want) {
				if time.Now().After(deadline) {
					t.Fatalf("logged %q, want it to contain %q", logged.String(), tc.want)
				}
				time.Sleep(10 * time.Millisecond)
			}
		})
	}
}
