package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"

	gen "github.com/kochan4php/go-platform-starter/services/rbac/gen"
	internal "github.com/kochan4php/go-platform-starter/services/rbac/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

type config struct {
	Port           string `env:"PORT" envDefault:"8080"`
	LogLevel       string `env:"LOG_LEVEL" envDefault:"info"`
	DatabaseURL    string `env:"DATABASE_URL,required"`
	RedisAddr      string `env:"REDIS_ADDR" envDefault:"127.0.0.1:6379"`
	RedisUsername  string `env:"REDIS_USERNAME" envDefault:""`
	RedisPassword  string `env:"REDIS_PASSWORD" envDefault:""`
	InternalSecret string `env:"INTERNAL_SECRET,required"`
}

func main() {
	migrateOnly := flag.Bool("migrate", false, "run migrations then exit")
	seedOnly := flag.Bool("seed", false, "load permission catalog + bootstrap admin role, then exit")
	flag.Parse()

	envFile := os.Getenv("APP_ENV_FILE")
	if envFile == "" {
		envFile = ".env"
	}
	if err := platform.LoadDotEnv(envFile); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[config]()
	log := platform.NewLogger(cfg.LogLevel, "rbac")

	shutdownTracer, err := platform.InitTracer(context.Background(), "rbac", log)
	if err != nil {
		log.Error("tracer init failed", "err", err)
		os.Exit(1)
	}
	defer func() { _ = shutdownTracer(context.Background()) }()

	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: platform.NewGormLogger(log, 0),
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

	rdb := platform.NewRedisClient(cfg.RedisAddr, cfg.RedisUsername, cfg.RedisPassword)
	svc := internal.NewService(db, log, internal.RedisPublisher{RDB: rdb})

	if *seedOnly {
		if err := svc.Seed(context.Background()); err != nil {
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

	gen.HandlerWithOptions(internal.NewHandlers(svc, log, cfg.InternalSecret), gen.ChiServerOptions{BaseURL: "/api/v1", BaseRouter: router})

	log.Info("rbac service listening", "port", cfg.Port)
	if err := platform.GracefulRun(":"+cfg.Port, router, func() { _ = closeDB(db) }); err != nil {
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
