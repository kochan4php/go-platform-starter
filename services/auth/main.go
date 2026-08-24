package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"

	gen "github.com/kochan4php/go-platform-starter/services/auth/gen"
	internal "github.com/kochan4php/go-platform-starter/services/auth/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

var strictPaths = map[string]bool{
	"/register": true, "/login": true, "/refresh": true,
	"/forgot": true, "/reset": true,
}

type ctxKeyAuth struct{}

func main() {
	migrateOnly := flag.Bool("migrate", false, "run migrations then exit")
	seedOnly := flag.Bool("seed", false, "bootstrap admin credentials then exit")
	flag.Parse()

	envFile := os.Getenv("APP_ENV_FILE")
	if envFile == "" {
		envFile = ".env"
	}
	if err := platform.LoadDotEnv(envFile); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[internal.Config]()
	log := platform.NewLogger(cfg.LogLevel, "auth")

	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: platform.NewGormLogger(log, cfg.SlowQueryThreshold),
	})
	if err != nil {
		log.Error("connect db failed", "err", err)
		os.Exit(1)
	}

	if err := internal.MigrateUp(cfg.DatabaseURL); err != nil {
		log.Error("migrate failed", "err", err)
		os.Exit(1)
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	pub := internal.RedisPublisher{RDB: rdb}
	svc := internal.NewService(db, rdb, log, *cfg, pub)

	switch {
	case *migrateOnly:
		fmt.Println("migrations applied")
		return
	case *seedOnly:
		if err := seedAdmin(context.Background(), svc, log); err != nil {
			log.Error("seed failed", "err", err)
			os.Exit(1)
		}
		return
	}

	router := platform.NewRouter(log, map[string]platform.Checker{
		"postgres": func(ctx context.Context) error { return pingDB(db) },
		"redis":    func(ctx context.Context) error { return rdb.Ping(ctx).Err() },
	})

	router.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		raw, _ := specFS.ReadFile("openapi.yaml")
		w.Header().Set("Content-Type", "application/yaml")
		_, _ = w.Write(raw)
	})

	router.Route("/api/v1", func(api chi.Router) {
		api.Use(internal.RateLimit(rdb, log, cfg.RateGlobalPerMinute, cfg.RateStrictPerMinute, strictPaths))
		api.Use(internal.RequireBearer([]byte(cfg.AccessTokenSecret)))
		handlers := internal.NewHandlers(svc, *cfg, log)
		gen.HandlerFromMux(handlers, api)
	})

	log.Info("auth service listening", "port", cfg.Port)
	if err := platform.GracefulRun(":"+cfg.Port, router, func() { _ = sqlClose(db) }); err != nil {
		log.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

func pingDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	return sqlDB.PingContext(ctx)
}

func sqlClose(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func seedAdmin(ctx context.Context, svc *internal.Service, log *slog.Logger) error {
	email := lowerEnv("ADMIN_EMAIL", "admin@example.local")
	password := os.Getenv("ADMIN_BOOTSTRAP_PASSWORD")
	if password == "" {
		generated, err := internal.RandomPassword()
		if err != nil {
			return err
		}
		password = generated
		fmt.Println("===========================================================")
		fmt.Println("BOOTSTRAP ADMIN PASSWORD (printed once — store it now):")
		fmt.Println(password)
		fmt.Println("email:", email)
		fmt.Println("===========================================================")
	}
	if _, err := svc.RegisterWithSub(ctx, platform.BootstrapSub, email, password); err != nil {
		return err
	}
	log.Info("bootstrap admin ready", "sub", platform.BootstrapSub, "email", email)
	return nil
}

func lowerEnv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		v = fallback
	}
	return strings.ToLower(v)
}
