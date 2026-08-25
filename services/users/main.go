package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	internal "github.com/kochan4php/go-platform-starter/services/users/internal"

	gen "github.com/kochan4php/go-platform-starter/services/users/gen"
)

//go:embed openapi.yaml
var specFS embed.FS

func main() {
	migrateOnly := flag.Bool("migrate", false, "run migrations then exit")
	flag.Parse()

	envFile := os.Getenv("APP_ENV_FILE")
	if envFile == "" {
		envFile = ".env"
	}
	if err := platform.LoadDotEnv(envFile); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[internal.Config]()
	log := platform.NewLogger(cfg.LogLevel, "users")

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
	if *migrateOnly {
		fmt.Println("migrations applied")
		return
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	svc := internal.NewService(db, rdb, log, internal.RedisPublisher{RDB: rdb})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go internal.ConsumeUserEvents(ctx, rdb, db, log)

	purgeDone := platform.NewScheduler(rdb, log, time.Hour, "users-profile-purge",
		func(ctx context.Context) {
			n, err := internal.PurgeDeletedProfiles(ctx, rdb, db)
			if err != nil {
				log.Error("profile purge failed", "err", err)
				return
			}
			if n > 0 {
				log.Info("profiles purged", "count", n)
			}
		}).Start(ctx)

	router := platform.NewRouter(log, map[string]platform.Checker{
		"postgres": func(ctx context.Context) error { return pingDB(db) },
		"redis":    func(ctx context.Context) error { return rdb.Ping(ctx).Err() },
	}, internal.IdentityMiddleware(cfg.InternalSecret))

	router.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		raw, _ := specFS.ReadFile("openapi.yaml")
		w.Header().Set("Content-Type", "application/yaml")
		_, _ = w.Write(raw)
	})

	gen.HandlerWithOptions(internal.NewHandlers(svc, log), gen.ChiServerOptions{
		BaseURL:    "/api/v1",
		BaseRouter: router,
	})

	log.Info("users service listening", "port", cfg.Port)
	if err := platform.GracefulRun(":"+cfg.Port, router, func() {
		cancel()
		<-purgeDone
		_ = closeDB(db)
	}); err != nil {
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

func closeDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
