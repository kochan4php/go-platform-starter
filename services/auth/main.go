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

	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"

	gen "github.com/kochan4php/go-platform-starter/services/auth/gen"
	internal "github.com/kochan4php/go-platform-starter/services/auth/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

var strictPaths = map[string]bool{
	"/register": true, "/login": true, "/refresh": true,
	"/forgot": true, "/reset": true, "/reset/validate": true,
}

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
	platform.StartPprof(os.Getenv("PPROF_ADDR"), log)
	if cfg.BcryptCost == 0 {
		cfg.BcryptCost = 10
		if strings.EqualFold(cfg.PasswordAlgorithm, "bcrypt") {
			cfg.BcryptCost = internal.CalibrateBcryptCost(cfg.BcryptTarget)
			log.Info("bcrypt cost calibrated", "cost", cfg.BcryptCost, "target", cfg.BcryptTarget)
		}
	}

	shutdownTracer, err := platform.InitTracer(context.Background(), "auth", log)
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

	if err := internal.MigrateUp(cfg.DatabaseURL); err != nil {
		log.Error("migrate failed", "err", err)
		os.Exit(1)
	}
	internal.RegisterSessionMetrics(db)

	rdb := platform.NewRedisClient(cfg.RedisAddr, cfg.RedisUsername, cfg.RedisPassword)
	redisCtx, redisCancel := context.WithTimeout(context.Background(), 30*time.Second)
	if err := platform.WaitForRedis(redisCtx, rdb); err != nil {
		redisCancel()
		log.Error("redis boot check failed", "err", err)
		os.Exit(1)
	}
	redisCancel()
	pub := internal.RedisPublisher{RDB: rdb, DB: db}
	svc := internal.NewService(db, rdb, log, *cfg, pub)
	if cfg.RBACInternalURL != "" && cfg.InternalSecret != "" {
		svc.UseClaimsClient(internal.NewClaimsClient(
			cfg.RBACInternalURL, cfg.InternalSecret, 30*time.Second, log,
		))
	} else {
		log.Warn("claims client disabled — tokens will carry no perms",
			"rbac_url_set", cfg.RBACInternalURL != "", "secret_set", cfg.InternalSecret != "")
	}

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
	},
		internal.RateLimit(rdb, log, cfg.RateGlobalPerMinute, cfg.RateStrictPerMinute, strictPaths),
		internal.RequireSessionIdentity(cfg.InternalSecret),
	)

	bgCtx, stopBg := context.WithCancel(context.Background())
	sweepDone := platform.NewScheduler(rdb, log, time.Hour, "auth-session-sweep",
		func(ctx context.Context) {
			n, err := internal.SweepSessions(ctx, db)
			if err != nil {
				log.Error("session sweep failed", "err", err)
				return
			}
			if n > 0 {
				platform.RecordHousekeeping("auth-session-sweep", n)
				log.Info("sessions swept", "count", n)
			}
		}).Start(bgCtx)
	defer stopBg()

	router.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		raw, _ := specFS.ReadFile("openapi.yaml")
		w.Header().Set("Content-Type", "application/yaml")
		_, _ = w.Write(raw)
	})

	gen.HandlerWithOptions(internal.NewHandlers(svc, *cfg, log), gen.ChiServerOptions{
		BaseURL:    "/api/v1",
		BaseRouter: router,
	})

	log.Info("auth service listening", "port", cfg.Port)
	if err := platform.GracefulRun(":"+cfg.Port, router, func() {
		stopBg()
		<-sweepDone
		_ = sqlClose(db)
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
	explicit := os.Getenv("ADMIN_BOOTSTRAP_PASSWORD") != ""
	if err := svc.EnsureBootstrapAdmin(ctx, platform.BootstrapSub, email, password); err != nil {
		return err
	}
	if !explicit {
		log.Info("bootstrap admin ensured; password unchanged because none was provided", "email", email)
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
