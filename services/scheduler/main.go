package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type config struct {
	Port               string        `env:"PORT" envDefault:"8080"`
	LogLevel           string        `env:"LOG_LEVEL" envDefault:"info"`
	DatabaseURL        string        `env:"DATABASE_URL,required"`
	RedisAddr          string        `env:"REDIS_ADDR" envDefault:"127.0.0.1:6379"`
	RedisUsername      string        `env:"REDIS_USERNAME" envDefault:""`
	RedisPassword      string        `env:"REDIS_PASSWORD" envDefault:""`
	ScheduledJobs      string        `env:"SCHEDULED_JOBS" envDefault:"[]"`
	SlowQueryThreshold time.Duration `env:"SLOW_QUERY_THRESHOLD" envDefault:"500ms"`
}

type jobConfig struct {
	Name    string          `json:"name"`
	Every   string          `json:"every"`
	Stream  string          `json:"stream"`
	Event   string          `json:"event"`
	Payload json.RawMessage `json:"payload"`
}

func main() {
	if err := platform.LoadDotEnv(envFile()); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[config]()
	log := platform.NewLogger(cfg.LogLevel, "scheduler")
	platform.StartPprof(os.Getenv("PPROF_ADDR"), log)
	shutdownTracer, err := platform.InitTracer(context.Background(), "scheduler", log)
	if err != nil {
		log.Error("tracer init failed", "err", err)
		os.Exit(1)
	}
	defer func() { _ = shutdownTracer(context.Background()) }()
	db, err := platform.OpenDatabase(cfg.DatabaseURL, log, cfg.SlowQueryThreshold)
	if err != nil {
		log.Error("connect db failed", "err", err)
		os.Exit(1)
	}
	rdb := platform.NewRedisClient(cfg.RedisAddr, cfg.RedisUsername, cfg.RedisPassword)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	redisCtx, redisCancel := context.WithTimeout(ctx, 30*time.Second)
	if err := platform.WaitForRedis(redisCtx, rdb); err != nil {
		redisCancel()
		log.Error("redis boot check failed", "err", err)
		os.Exit(1)
	}
	redisCancel()
	jobs, err := parseJobs(cfg.ScheduledJobs)
	if err != nil {
		log.Error("invalid scheduled jobs", "err", err)
		os.Exit(1)
	}
	electionDone := make(chan struct{})
	go func() {
		defer close(electionDone)
		platform.NewLeaderElector(rdb, log, "scheduler-service", 15*time.Second).Run(ctx, func(leaderCtx context.Context) {
			runJobs(leaderCtx, rdb, db, log, jobs)
		})
	}()
	router := platform.NewRouter(log, map[string]platform.Checker{
		"postgres": func(context.Context) error { return pingDB(db) },
		"redis":    func(ctx context.Context) error { return rdb.Ping(ctx).Err() },
	})
	log.Info("scheduler service listening", "port", cfg.Port, "jobs", len(jobs))
	if err := platform.GracefulRun(":"+cfg.Port, router, func() {
		cancel()
		<-electionDone
		_ = closeDB(db)
	}); err != nil {
		log.Error("server exited", "err", err)
		os.Exit(1)
	}
}

func parseJobs(raw string) ([]jobConfig, error) {
	var jobs []jobConfig
	if err := json.Unmarshal([]byte(raw), &jobs); err != nil {
		return nil, err
	}
	for _, job := range jobs {
		interval, err := time.ParseDuration(job.Every)
		if job.Name == "" || job.Stream == "" || job.Event == "" || err != nil || interval < time.Second {
			return nil, platform.ErrBadRequest("each scheduled job requires name, stream, event, and every >= 1s")
		}
	}
	return jobs, nil
}

func runJobs(ctx context.Context, rdb *redis.Client, db *gorm.DB, log *slog.Logger, jobs []jobConfig) {
	done := make([]<-chan struct{}, 0, len(jobs))
	for _, job := range jobs {
		interval, _ := time.ParseDuration(job.Every)
		job := job
		done = append(done, platform.NewScheduler(rdb, log, interval, "scheduled-"+job.Name, func(runCtx context.Context) {
			var payload any = map[string]any{}
			if len(job.Payload) > 0 {
				_ = json.Unmarshal(job.Payload, &payload)
			}
			if err := platform.PublishWithAuditOutbox(runCtx, db, rdb, job.Stream, job.Event, payload); err != nil {
				log.Error("scheduled event publish failed", "job", job.Name, "err", err)
			}
		}).Start(ctx))
	}
	<-ctx.Done()
	for _, ch := range done {
		<-ch
	}
}

func envFile() string {
	if value := os.Getenv("APP_ENV_FILE"); value != "" {
		return value
	}
	return ".env"
}

func pingDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}

func closeDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
