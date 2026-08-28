package main

import (
	"context"
	"embed"
	"flag"
	"fmt"
	"net/http"
	"os"
	"time"

	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	internal "github.com/kochan4php/go-platform-starter/services/worker/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

type config struct {
	Port               string        `env:"PORT" envDefault:"8080"`
	LogLevel           string        `env:"LOG_LEVEL" envDefault:"info"`
	DatabaseURL        string        `env:"DATABASE_URL,required"`
	RedisAddr          string        `env:"REDIS_ADDR" envDefault:"127.0.0.1:6379"`
	RedisUsername      string        `env:"REDIS_USERNAME" envDefault:""`
	RedisPassword      string        `env:"REDIS_PASSWORD" envDefault:""`
	InternalSecret     string        `env:"INTERNAL_SECRET,required"`
	MailerDriver       string        `env:"MAILER_DRIVER" envDefault:"console"`
	SMTPHost           string        `env:"SMTP_HOST"`
	SMTPPort           int           `env:"SMTP_PORT" envDefault:"587"`
	SMTPUser           string        `env:"SMTP_USER"`
	SMTPPass           string        `env:"SMTP_PASS"`
	MailFrom           string        `env:"MAIL_FROM" envDefault:"noreply@example.local"`
	MailFromName       string        `env:"MAIL_FROM_NAME" envDefault:"Platform"`
	MailFallbackHost   string        `env:"MAIL_FALLBACK_HOST"`
	MailFallbackPort   int           `env:"MAIL_FALLBACK_PORT" envDefault:"587"`
	MailFallbackUser   string        `env:"MAIL_FALLBACK_USER"`
	MailFallbackPass   string        `env:"MAIL_FALLBACK_PASS"`
	AuditRetentionDays int           `env:"AUDIT_RETENTION_DAYS" envDefault:"365"`
	WorkerConcurrency  int           `env:"WORKER_CONCURRENCY" envDefault:"4"`
	WorkerReadCount    int64         `env:"WORKER_XREAD_COUNT" envDefault:"100"`
	WorkerMinIdle      time.Duration `env:"WORKER_MIN_IDLE" envDefault:"30s"`
	DLQMaxDepth        int64         `env:"DLQ_MAX_DEPTH" envDefault:"10000"`
	DLQRedisUsername   string        `env:"DLQ_REDIS_USERNAME"`
	DLQRedisPassword   string        `env:"DLQ_REDIS_PASSWORD"`
}

func main() {
	migrateOnly := flag.Bool("migrate", false, "run migrations then exit")
	replayStream := flag.String("replay", "", "replay up to 100 messages from <stream>:dlq")
	flag.Parse()

	if err := platform.LoadDotEnv(envFile()); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[config]()
	log := platform.NewLogger(cfg.LogLevel, "worker")
	platform.StartPprof(os.Getenv("PPROF_ADDR"), log)

	shutdownTracer, err := platform.InitTracer(context.Background(), "worker", log)
	if err != nil {
		log.Error("tracer init failed", "err", err)
		os.Exit(1)
	}
	defer func() { _ = shutdownTracer(context.Background()) }()

	db, err := platform.OpenDatabase(cfg.DatabaseURL, log, 500*time.Millisecond)
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
	redisCtx, redisCancel := context.WithTimeout(context.Background(), 30*time.Second)
	if err := platform.WaitForRedis(redisCtx, rdb); err != nil {
		redisCancel()
		log.Error("redis boot check failed", "err", err)
		os.Exit(1)
	}
	redisCancel()
	if *replayStream != "" {
		if cfg.DLQRedisUsername != "" {
			rdb = platform.NewRedisClient(cfg.RedisAddr, cfg.DLQRedisUsername, cfg.DLQRedisPassword)
		}
		n, replayErr := internal.ReplayDLQ(context.Background(), rdb, *replayStream, 100)
		if replayErr != nil {
			log.Error("DLQ replay failed", "stream", *replayStream, "err", replayErr)
			os.Exit(1)
		}
		fmt.Printf("replayed %d message(s) from %s:dlq\n", n, *replayStream)
		return
	}
	mailer, err := platform.NewMailer(platform.SMTPConfig{
		Driver: cfg.MailerDriver, Host: cfg.SMTPHost, Port: cfg.SMTPPort,
		User: cfg.SMTPUser, Pass: cfg.SMTPPass, From: cfg.MailFrom, FromName: cfg.MailFromName,
	}, log)
	if err != nil {
		log.Error("mailer init failed", "err", err)
		os.Exit(1)
	}
	if cfg.MailFallbackHost != "" {
		fallback, fallbackErr := platform.NewMailer(platform.SMTPConfig{
			Driver: "smtp", Host: cfg.MailFallbackHost, Port: cfg.MailFallbackPort,
			User: cfg.MailFallbackUser, Pass: cfg.MailFallbackPass, From: cfg.MailFrom, FromName: cfg.MailFromName,
		}, log)
		if fallbackErr != nil {
			log.Error("fallback mailer init failed", "err", fallbackErr)
			os.Exit(1)
		}
		mailer = platform.FallbackMailer{Primary: mailer, Secondary: fallback}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	consumer := internal.NewConsumer(rdb, db, mailer, log).Configure(cfg.WorkerConcurrency, cfg.WorkerReadCount).ConfigureReliability(cfg.WorkerMinIdle, cfg.DLQMaxDepth)
	consumerDone := make(chan struct{})
	go func() { consumer.Run(ctx); close(consumerDone) }()
	retentionDone := platform.NewScheduler(rdb, log, 24*time.Hour, "audit-retention", func(ctx context.Context) {
		if cfg.AuditRetentionDays <= 0 {
			return
		}
		result := db.WithContext(ctx).Exec(
			`DELETE FROM audit.audit_logs WHERE created_at < now() - (? * interval '1 day')`, cfg.AuditRetentionDays,
		)
		if result.Error != nil {
			log.Error("audit retention purge failed", "err", result.Error)
		} else if result.RowsAffected > 0 {
			platform.RecordHousekeeping("audit-retention", result.RowsAffected)
			log.Info("expired audit entries purged", "count", result.RowsAffected)
		}
	}).Start(ctx)
	outboxDone := platform.NewScheduler(rdb, log, 10*time.Second, "audit-outbox-relay", func(ctx context.Context) {
		n, err := internal.FlushAuditOutbox(ctx, db, rdb)
		if err != nil {
			log.Error("audit outbox relay failed", "err", err)
			return
		}
		if n > 0 {
			log.Info("audit outbox relayed", "count", n)
		}
	}).Start(ctx)

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
	if err := platform.GracefulRun(":"+cfg.Port, router, func() {
		cancel()
		<-consumerDone
		<-retentionDone
		<-outboxDone
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

func envFile() string {
	if v := os.Getenv("APP_ENV_FILE"); v != "" {
		return v
	}
	return ".env"
}
