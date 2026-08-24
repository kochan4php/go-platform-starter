package main

import (
	"os"
	"time"

	"github.com/go-chi/chi/v5"

	gen "github.com/kochan4php/go-platform-starter/services/_template/gen"
	internal "github.com/kochan4php/go-platform-starter/services/_template/internal"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type config struct {
	Port               string        `env:"PORT" envDefault:"8080"`
	LogLevel           string        `env:"LOG_LEVEL" envDefault:"info"`
	SlowQueryThreshold time.Duration `env:"SLOW_QUERY_THRESHOLD" envDefault:"500ms"`
}

func main() {
	envFile := os.Getenv("APP_ENV_FILE")
	if envFile == "" {
		envFile = ".env"
	}
	if err := platform.LoadDotEnv(envFile); err != nil {
		panic(err)
	}

	cfg := platform.MustParseEnv[config]()
	log := platform.NewLogger(cfg.LogLevel, "_template")

	router := platform.NewRouter(log, nil)
	router.Route("/api/v1", func(r chi.Router) {
		gen.HandlerFromMux(internal.NewHandlers(log), r)
	})

	log.Info("starting service", "port", cfg.Port)
	if err := platform.GracefulRun(":"+cfg.Port, router); err != nil {
		log.Error("server exited with error", "err", err)
		os.Exit(1)
	}
	log.Info("shutdown complete")
}
