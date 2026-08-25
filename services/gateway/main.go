package main

import (
	"context"
	"embed"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/go-redis/redis_rate/v10"
	"github.com/redis/go-redis/v9"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	internal "github.com/kochan4php/go-platform-starter/services/gateway/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

type ctxKeyAuth struct{}

func main() {
	flag.Parse()

	if err := platform.LoadDotEnv(envFile()); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[internal.Config]()
	log := platform.NewLogger(cfg.LogLevel, "gateway")

	shutdownTracer, err := platform.InitTracer(context.Background(), "gateway", log)
	if err != nil {
		log.Error("tracer init failed", "err", err)
		os.Exit(1)
	}
	defer func() { _ = shutdownTracer(context.Background()) }()

	// Slow-request log gate (PLAN item 73), env-tunable at the edge.
	if cfg.SlowRequestMs > 0 {
		platform.SetSlowRequestThreshold(time.Duration(cfg.SlowRequestMs) * time.Millisecond)
	}

	upstreams, err := internal.ParseUpstreams(cfg.UpstreamsJSON)
	if err != nil {
		log.Error("bad UPSTREAMS", "err", err)
		os.Exit(1)
	}

	specCtx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	routes, specs, err := internal.LoadSpecs(specCtx, upstreams, log)
	cancel()
	if err != nil {
		log.Error("spec load failed (fail-closed boot)", "err", err)
		os.Exit(1)
	}
	cfg.SetRuntime(upstreams, routes, specs)

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	limiter := redis_rate.NewLimiter(rdb)

	router := platform.NewRouter(log, map[string]platform.Checker{
		"redis": func(ctx context.Context) error { return rdb.Ping(ctx).Err() },
	}, corsHandler(cfg.TrustedDomains))

	aggregate, aggErr := internal.AggregateDocs(specs)
	if aggErr != nil {
		log.Error("aggregate docs failed", "err", aggErr)
	}
	jsonDocs, scalarPage := internal.ScalarHandlers(func() []byte { return aggregate })
	router.Get("/docs/openapi.json", jsonDocs)
	router.Get("/docs", scalarPage)

	router.Get("/openapi.json", func(w http.ResponseWriter, _ *http.Request) {
		raw, _ := specFS.ReadFile("openapi.yaml")
		w.Header().Set("Content-Type", "application/yaml")
		_, _ = w.Write(raw)
	})

	router.Group(func(api chi.Router) {
		api.Use(edgeRateLimit(limiter, log, cfg.RatePerMinute))
		api.Use(bodyLimit(1 << 20))
		api.Use(internal.ProxyHandler(internal.ProxyDeps{
			Secret:         []byte(cfg.AccessTokenSecret),
			InternalSecret: cfg.InternalSecret,
			Log:            log,
			Matcher:        cfg.Matcher(),
			Upstreams:      upstreams,
		}))
		api.HandleFunc("/*", func(w http.ResponseWriter, _ *http.Request) {
			platform.Fail(w, http.StatusNotFound, "not_found", "no route")
		})
	})

	log.Info("gateway listening — fail-closed registry satisfied",
		"port", cfg.Port, "upstreams", len(upstreams), "routes", len(routes))
	if err := platform.GracefulRun(":"+cfg.Port, router); err != nil {
		log.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

func envFile() string {
	if v := os.Getenv("APP_ENV_FILE"); v != "" {
		return v
	}
	return ".env"
}

func corsHandler(trustedCSV string) func(http.Handler) http.Handler {
	origins := []string{}
	for _, d := range splitCSV(trustedCSV) {
		origins = append(origins, d)
	}
	return cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}

func splitCSV(s string) []string {
	out := []string{}
	for _, part := range strings.Split(s, ",") {
		if t := trimSpace(part); t != "" {
			out = append(out, t)
		}
	}
	return out
}

func trimSpace(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t') {
		s = s[:len(s)-1]
	}
	return s
}

func edgeRateLimit(limiter *redis_rate.Limiter, log *slog.Logger, perMinute int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			res, err := limiter.Allow(r.Context(), "rl:edge:"+clientIP(r), redis_rate.PerMinute(perMinute))
			if err != nil {
				log.Warn("edge rate limiter unavailable (fail-open)", "err", err)
				next.ServeHTTP(w, r)
				return
			}
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(perMinute))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(res.Remaining))
			if res.Allowed == 0 {
				platform.Fail(w, http.StatusTooManyRequests, "rate_limited", "too many requests")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func bodyLimit(n int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, n)
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) string {
	if xf := r.Header.Get("X-Forwarded-For"); xf != "" {
		for i := 0; i < len(xf); i++ {
			if xf[i] == ',' {
				return trimSpace(xf[:i])
			}
		}
		return trimSpace(xf)
	}
	host := r.RemoteAddr
	for i := len(host) - 1; i >= 0; i-- {
		if host[i] == ':' {
			return host[:i]
		}
	}
	return host
}
