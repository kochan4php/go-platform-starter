package main

import (
	"context"
	"embed"
	"flag"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/go-redis/redis_rate/v10"
	"github.com/prometheus/client_golang/prometheus"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	internal "github.com/kochan4php/go-platform-starter/services/gateway/internal"
)

//go:embed openapi.yaml
var specFS embed.FS

type ctxKeyAuth struct{}

var rateLimitDecisions = prometheus.NewCounterVec(prometheus.CounterOpts{
	Name: "gateway_rate_limit_decisions_total",
	Help: "Rate-limit decisions by authenticated consumer, route class, and result.",
}, []string{"consumer", "class", "result"})

func init() { prometheus.MustRegister(rateLimitDecisions) }

func main() {
	flag.Parse()

	if err := platform.LoadDotEnv(envFile()); err != nil {
		panic(err)
	}
	cfg := platform.MustParseEnv[internal.Config]()
	log := platform.NewLogger(cfg.LogLevel, "gateway")
	platform.StartPprof(os.Getenv("PPROF_ADDR"), log)

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
	validator, err := internal.NewRequestValidator(specs)
	if err != nil {
		log.Error("request validator build failed", "err", err)
		os.Exit(1)
	}
	consumerQuotas, err := internal.ParseConsumerQuotas(cfg.ConsumerQuotas)
	if err != nil {
		log.Error("bad consumer quotas", "err", err)
		os.Exit(1)
	}
	webSocketRoutes, err := internal.ParseWebSocketRoutes(cfg.WebSocketRoutes, cfg.RealtimeUpstream)
	if err != nil {
		log.Error("bad WebSocket routes", "err", err)
		os.Exit(1)
	}

	rdb := platform.NewRedisClient(cfg.RedisAddr, cfg.RedisUsername, cfg.RedisPassword)
	redisCtx, redisCancel := context.WithTimeout(context.Background(), 30*time.Second)
	if err := platform.WaitForRedis(redisCtx, rdb); err != nil {
		redisCancel()
		log.Error("redis boot check failed", "err", err)
		os.Exit(1)
	}
	redisCancel()
	limiter := redis_rate.NewLimiter(rdb)
	trustedProxies := parsePrefixes(cfg.TrustedProxyCIDRs)

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
	quotaPolicy := consumerQuotaPolicy{secret: cfg.AccessTokenSecret, overrides: consumerQuotas}
	router.With(edgeRateLimit(limiter, log, cfg.RatePerMinute, cfg.Matcher(), trustedProxies, quotaPolicy)).Post("/telemetry/vitals", internal.WebVitals)
	router.With(edgeRateLimit(limiter, log, cfg.RatePerMinute, cfg.Matcher(), trustedProxies, quotaPolicy)).Post("/telemetry/errors", internal.FrontendErrors(log))
	router.Get("/status", internal.StatusPage(upstreams))

	// WebSocket passthrough to the realtime service (PLAN item 41/47): the
	// upgrade request cannot be a registry route, so it gets its own proxy.
	for path, target := range webSocketRoutes {
		wsProxy := &httputil.ReverseProxy{
			Rewrite: func(pr *httputil.ProxyRequest) {
				pr.Out.URL.Scheme = target.Scheme
				pr.Out.URL.Host = target.Host
			},
			ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
				log.Error("ws upstream failed", "err", err)
				platform.Fail(w, http.StatusServiceUnavailable, "upstream_unavailable", "realtime is not responding")
			},
		}
		router.Get(path, wsProxy.ServeHTTP)
	}

	plugins := internal.NewMiddlewareRegistry()
	plugins.Register("rate-limit", edgeRateLimit(limiter, log, cfg.RatePerMinute, cfg.Matcher(), trustedProxies, quotaPolicy))
	plugins.Register("body-guard", routeBodyGuard(cfg.Matcher()))
	plugins.Register("proxy", internal.ProxyHandler(internal.ProxyDeps{
		Secret: cfg.AccessTokenSecret, InternalSecret: platform.ActiveSecret(cfg.InternalSecret), Log: log,
		Matcher: cfg.Matcher(), Upstreams: upstreams, RDB: rdb, Validator: validator,
		ClientIP: func(r *http.Request) string { return clientIP(r, trustedProxies) },
	}))
	pluginChain, err := plugins.Chain(cfg.MiddlewarePlugins)
	if err != nil {
		log.Error("gateway middleware registry invalid", "err", err)
		os.Exit(1)
	}
	router.Group(func(api chi.Router) {
		api.Use(pluginChain)
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
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID", "X-Device-ID", "Idempotency-Key"},
		ExposedHeaders:   []string{"X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Idempotency-Replayed"},
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

type consumerQuotaPolicy struct {
	secret    string
	overrides map[string]int
}

func edgeRateLimit(limiter *redis_rate.Limiter, log *slog.Logger, perMinute int, matcher *internal.Matcher, trusted []netip.Prefix, policies ...consumerQuotaPolicy) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			limit := perMinute
			class := "standard"
			bucket := class
			consumer := clientIP(r, trusted)
			metricConsumer := "anonymous"
			route := matcher.Match(r.Method, r.URL.Path)
			if route != nil {
				class = route.RateClass
				bucket = class + ":" + route.Method + ":" + route.Path
				switch class {
				case "strict":
					limit = min(perMinute, 20)
				case "relaxed":
					limit = perMinute * 2
				}
			}
			if len(policies) > 0 {
				raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
				if claims, err := internal.ParseAccess(policies[0].secret, raw); err == nil {
					consumer = claims.Sub
					metricConsumer = claims.Sub
					if route != nil && route.ConsumerQuota > 0 {
						limit = route.ConsumerQuota
					}
					if override := policies[0].overrides[claims.Sub]; override > 0 {
						limit = override
					}
				}
			}
			res, err := limiter.Allow(r.Context(), "rl:edge:"+bucket+":"+consumer, redis_rate.PerMinute(limit))
			if err != nil {
				rateLimitDecisions.WithLabelValues(metricConsumer, class, "unavailable").Inc()
				if class == "strict" {
					log.Error("strict edge rate limiter unavailable (fail-closed)", "err", err)
					platform.Fail(w, http.StatusServiceUnavailable, "rate_limit_unavailable", "request protection is temporarily unavailable")
					return
				}
				log.Warn("edge rate limiter unavailable (fail-open)", "class", class, "err", err)
				next.ServeHTTP(w, r)
				return
			}
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limit))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(res.Remaining))
			resetSeconds := max(1, int((res.ResetAfter+time.Second-1)/time.Second))
			w.Header().Set("X-RateLimit-Reset", strconv.Itoa(resetSeconds))
			if res.Allowed == 0 {
				rateLimitDecisions.WithLabelValues(metricConsumer, class, "denied").Inc()
				retrySeconds := max(1, int((res.RetryAfter+time.Second-1)/time.Second))
				w.Header().Set("Retry-After", strconv.Itoa(retrySeconds))
				platform.Fail(w, http.StatusTooManyRequests, "rate_limited", "too many requests")
				return
			}
			rateLimitDecisions.WithLabelValues(metricConsumer, class, "allowed").Inc()
			next.ServeHTTP(w, r)
		})
	}
}

func routeBodyGuard(matcher *internal.Matcher) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			limit := int64(1 << 20)
			if route := matcher.Match(r.Method, r.URL.Path); route != nil {
				limit = route.BodyLimit
			}
			if r.ContentLength > limit {
				platform.Fail(w, http.StatusRequestEntityTooLarge, "body_too_large", "request body exceeds the route limit")
				return
			}
			contentType := strings.ToLower(r.Header.Get("Content-Type"))
			if r.ContentLength > 0 && r.Method != http.MethodGet && !strings.HasPrefix(contentType, "application/json") && !strings.HasPrefix(contentType, "multipart/form-data") {
				platform.Fail(w, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json or multipart/form-data")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request, trusted []netip.Prefix) string {
	remote := remoteIP(r.RemoteAddr)
	trustedProxy := false
	if address, err := netip.ParseAddr(remote); err == nil {
		for _, prefix := range trusted {
			trustedProxy = trustedProxy || prefix.Contains(address)
		}
	}
	if trustedProxy {
		if xf := r.Header.Get("X-Forwarded-For"); xf != "" {
			for i := 0; i < len(xf); i++ {
				if xf[i] == ',' {
					return trimSpace(xf[:i])
				}
			}
			return trimSpace(xf)
		}
	}
	return remote
}

func remoteIP(remoteAddr string) string {
	host := remoteAddr
	for i := len(host) - 1; i >= 0; i-- {
		if host[i] == ':' {
			return host[:i]
		}
	}
	return host
}

func parsePrefixes(raw string) []netip.Prefix {
	prefixes := make([]netip.Prefix, 0)
	for _, item := range splitCSV(raw) {
		if prefix, err := netip.ParsePrefix(item); err == nil {
			prefixes = append(prefixes, prefix)
		}
	}
	return prefixes
}
