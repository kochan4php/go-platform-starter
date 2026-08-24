package platform

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

// ServerConfig is the common HTTP server configuration every service uses.
type ServerConfig struct {
	Port         int           `env:"PORT" default:"3000"`
	ReadTimeout  time.Duration `env:"HTTP_READ_TIMEOUT" default:"10s"`
	WriteTimeout time.Duration `env:"HTTP_WRITE_TIMEOUT" default:"30s"`
	IdleTimeout  time.Duration `env:"HTTP_IDLE_TIMEOUT" default:"60s"`
}

// Addr returns the listen address derived from the port.
func (c *ServerConfig) Addr() string {
	return ":" + strconv.Itoa(c.Port)
}

// GracefulRun starts the HTTP server and blocks until ctx is cancelled
// (SIGTERM/SIGINT via the caller) or the listener fails. Shutdown drains with a
// 15-second budget — k8s SIGTERM parity with the legacy Bootstrap.
func GracefulRun(ctx context.Context, log *slog.Logger, cfg *ServerConfig, handler http.Handler) error {
	srv := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      handler,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("server started", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		log.Info("shutting down gracefully")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			return err
		}
		log.Info("server closed")
		return nil
	}
}
