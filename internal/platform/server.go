package platform

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
)

func GracefulRun(addr string, handler http.Handler, cleanup ...func()) error {
	srv := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	done := make(chan struct{})
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		defer signal.Stop(sig)
		<-sig
		ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout())
		defer cancel()
		_ = srv.Shutdown(ctx)
		close(done)
	}()

	err := srv.ListenAndServe()
	select {
	case <-done:
		for _, fn := range cleanup {
			fn()
		}
		return nil
	default:
	}
	if !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("listen %s: %w", addr, err)
	}
	for _, fn := range cleanup {
		fn()
	}
	return nil
}

func shutdownTimeout() time.Duration {
	if value, err := time.ParseDuration(os.Getenv("SHUTDOWN_TIMEOUT")); err == nil && value > 0 {
		return value
	}
	if seconds, err := strconv.Atoi(os.Getenv("SHUTDOWN_TIMEOUT_SECONDS")); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	return 10 * time.Second
}
