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
	internal "github.com/kochan4php/go-platform-starter/services/worker/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

type config struct {
	Port           string `env:"PORT" envDefault:"8080"`
	LogLevel       string `env:"LOG_LEVEL" envDefault:"info"`
	DatabaseURL    string `env:"DATABASE_URL,required"`
	RedisAddr      string `env:"REDIS_ADDR" envDefault:"127.0.0.1:6379"`
	InternalSecret string `env:"INTERNAL_SECRET,required"`
	MailerDriver   string `env:"MAILER_DRIVER" envDefault:"console"`
	SMTPHost       string `env:"SMTP_HOST"`
	SMTPPort       int    `env:"SMTP_PORT" envDefault:"587"`
	SMTPUser       string `env:"SMTP_USER"`
	SMTPPass       string `env:"SMTP_PASS"`
	MailFrom       string `env:"MAIL_FROM" envDefault:"noreply@example.local"`
	MailFromName   string `env:"MAIL_FROM_NAME" envDefault:"Platform"`
}

func main() {
	migrateOnly := flag.Bool("migrate", false, "run migrations then exit")
	flag.Parse()

	if err := platform.LoadDotEnv(envFile()); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[config]()
	log := platform.NewLogger(cfg.LogLevel, "worker")

	shutdownTracer, err := platform.InitTracer(context.Background(), "worker", log)
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

	rdb := newRedis(cfg.RedisAddr)
	mailer, err := platform.NewMailer(platform.SMTPConfig{
		Driver: cfg.MailerDriver, Host: cfg.SMTPHost, Port: cfg.SMTPPort,
		User: cfg.SMTPUser, Pass: cfg.SMTPPass, From: cfg.MailFrom, FromName: cfg.MailFromName,
	}, log)
	if err != nil {
		log.Error("mailer init failed", "err", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	consumer := internal.NewConsumer(rdb, db, mailer, log)
	go consumer.Run(ctx)

	router := platform.NewRouter(log, map[string]platform.Checker{
		"postgres": func(ctx context.Context) error { return pingDB(db) },
		"redis":    func(ctx context.Context) error { return rdb.Ping(ctx).Err() },
	})

	router.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		raw, _ := specFS.ReadFile("openapi.yaml")
		w.Header().Set("Content-Type", "application/yaml")
		_, _ = w.Write(raw)
	})

	// Central audit view (PLAN item 74) — mounted under the gateway-facing
	// /api/v1 prefix; the route registry guards it with audit:read:any.
	router.Get("/api/v1/audit/viewer", internal.AuditViewer(db, cfg.InternalSecret))

	log.Info("worker listening (consumer in background)", "port", cfg.Port)
	if err := platform.GracefulRun(":"+cfg.Port, router, func() { _ = closeDB(db) }); err != nil {
		log.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

func newRedis(addr string) *redis.Client { return redis.NewClient(&redis.Options{Addr: addr}) }

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

func envFile() string {
	if v := os.Getenv("APP_ENV_FILE"); v != "" {
		return v
	}
	return ".env"
}
