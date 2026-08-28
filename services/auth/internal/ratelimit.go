package internal

import (
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-redis/redis_rate/v10"
	"github.com/redis/go-redis/v9"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

// RateLimit enforces per-minute per-IP quotas with two route classes:
// paths in strictSet use the stricter quota, everything else the global one.
// On any Redis failure it fails OPEN — availability over hardening (item 18).
func RateLimit(rdb *redis.Client, log *slog.Logger, globalPerMinute, strictPerMinute int, strictPaths map[string]bool) func(http.Handler) http.Handler {
	limiter := redis_rate.NewLimiter(rdb)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/api/v1")
			class, perMinute := "global", globalPerMinute
			if strictPaths[path] {
				class, perMinute = "strict", strictPerMinute
			}

			res, err := limiter.Allow(r.Context(), "rl:"+class+":"+clientIP(r), redis_rate.PerMinute(perMinute))
			if err != nil {
				if class == "strict" {
					log.Error("strict rate limiter unavailable (fail-closed)", "err", err)
					platform.Fail(w, http.StatusServiceUnavailable, "rate_limit_unavailable", "request protection is temporarily unavailable")
					return
				}
				log.Warn("rate limiter unavailable (fail-open)", "class", class, "err", err)
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(perMinute))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(res.Remaining))
			if res.Allowed == 0 {
				retry := int(res.ResetAfter.Seconds()) + 1
				w.Header().Set("Retry-After", strconv.Itoa(retry))
				log.Warn("rate limited", "ip", clientIP(r), "class", class)
				platform.Fail(w, http.StatusTooManyRequests, "rate_limited", "too many requests")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
