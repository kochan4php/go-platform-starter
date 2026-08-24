package main

import (
	"context"
	"embed"
	"flag"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/go-redis/v9"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	internal "github.com/kochan4php/go-platform-starter/services/realtime/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

type config struct {
	Port              string `env:"PORT" envDefault:"8080"`
	LogLevel          string `env:"LOG_LEVEL" envDefault:"info"`
	RedisAddr         string `env:"REDIS_ADDR" envDefault:"localhost:6379"`
	AccessTokenSecret string `env:"ACCESS_TOKEN_SECRET,required"`
	PublicWSUrl       string `env:"PUBLIC_WS_URL" envDefault:"ws://localhost:8000/ws"`
	Rooms             string `env:"ROOMS" envDefault:"lobby,general"`
	MaxPerRoom        int    `env:"MAX_PER_ROOM" envDefault:"50"`
}

func main() {
	flag.Parse()

	if err := platform.LoadDotEnv(envFile()); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[config]()
	log := platform.NewLogger(cfg.LogLevel, "realtime")

	rdb := newRedis(cfg.RedisAddr)

	connections := prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "realtime_connections",
		Help: "current websocket connections",
	})
	prometheus.MustRegister(connections)

	hub := internal.NewHub(log, splitCSV(cfg.Rooms), cfg.MaxPerRoom, connections)
	hub.Kick(context.Background(), rdb)

	router := platform.NewRouter(log, map[string]platform.Checker{
		"redis": func(ctx context.Context) error { return rdb.Ping(ctx).Err() },
	})

	router.Get("/ws", internal.NewHandlers(hub, []byte(cfg.AccessTokenSecret), log).WS)

	router.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		raw, _ := specFS.ReadFile("openapi.yaml")
		w.Header().Set("Content-Type", "application/yaml")
		_, _ = w.Write(raw)
	})

	router.Route("/api/v1/realtime", func(api chi.Router) {
		api.Use(bearerGuard([]byte(cfg.AccessTokenSecret)))
		api.Get("/info", func(w http.ResponseWriter, _ *http.Request) {
			platform.OK(w, http.StatusOK, "ok", map[string]string{
				"wsUrl":    cfg.PublicWSUrl,
				"protocol": "v1",
			})
		})
	})

	log.Info("realtime service listening", "port", cfg.Port)
	if err := platform.GracefulRun(":"+cfg.Port, router); err != nil {
		log.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

func newRedis(addr string) *redis.Client { return redis.NewClient(&redis.Options{Addr: addr}) }

func envFile() string {
	if v := os.Getenv("APP_ENV_FILE"); v != "" {
		return v
	}
	return ".env"
}

func bearerGuard(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if _, err := platform.ParseAccessToken(secret, raw); err != nil {
				platform.WriteError(w, platform.LoggerFromContext(r.Context()), platform.ErrUnauthorized("invalid access token"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func splitCSV(s string) []string {
	out := []string{}
	for _, p := range strings.Split(s, ",") {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

var ()
