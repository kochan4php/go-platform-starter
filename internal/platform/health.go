package platform

import (
	"context"
	"fmt"
	"time"
)

var processStart = time.Now()

// uptimeSeconds mirrors Node's process.uptime() semantics for the health payload.
func uptimeSeconds() float64 {
	return time.Since(processStart).Seconds()
}

func nowMillis() int64 { return time.Now().UnixMilli() }

// safeCheck keeps a failing readiness probe from ever taking the process down.
func safeCheck(check func(ctx context.Context) error, ctx context.Context) (err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("readiness check panicked: %v", rec)
		}
	}()
	return check(ctx)
}
