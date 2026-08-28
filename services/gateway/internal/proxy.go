package internal

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/redis/go-redis/v9"
)

// LoadSpecs fetches every upstream's /openapi.json, builds the route table
// and fails closed: an unreachable spec or an unknown permission aborts boot.
func LoadSpecs(ctx context.Context, upstreams Upstreams, log *slog.Logger) ([]Route, map[string][]byte, error) {
	hc := &http.Client{Timeout: 5 * time.Second}
	routes := make([]Route, 0, 32)
	specs := make(map[string][]byte, len(upstreams))

	for name, base := range upstreams {
		base = primaryEndpoint(base)
		var raw []byte
		var lastErr error
		// Siblings may start after the gateway (docker compose race); waiting
		// is correct here — failing closed on an unreachable spec means the
		// gateway could never serve, so retry until the spec arrives.
		for attempt := 1; ; attempt++ {
			if attempt > 30 {
				lastErr = fmt.Errorf("gave up after 30 attempts")
				break
			}
			req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/openapi.json", nil)
			res, err := hc.Do(req)
			if err != nil {
				lastErr = err
			} else if res.StatusCode != http.StatusOK {
				lastErr = fmt.Errorf("%s returned %d", name, res.StatusCode)
				res.Body.Close()
			} else {
				buf := make([]byte, 0, 32<<10)
				tmp := make([]byte, 4096)
				for {
					n, rerr := res.Body.Read(tmp)
					buf = append(buf, tmp[:n]...)
					if rerr != nil {
						break
					}
				}
				res.Body.Close()
				raw = buf
				break
			}
			delay := min(250*time.Millisecond*time.Duration(1<<min(attempt-1, 4)), 4*time.Second) + time.Duration(rand.IntN(200))*time.Millisecond
			select {
			case <-time.After(delay):
			case <-ctx.Done():
				return nil, nil, fmt.Errorf("fetch spec of %s: %w", name, ctx.Err())
			}
		}
		if raw == nil {
			return nil, nil, fmt.Errorf("fetch spec of %s: %w", name, lastErr)
		}

		table, err := SpecRouteTable(name, string(raw))
		if err != nil {
			return nil, nil, err
		}
		routes = append(routes, table...)
		specs[name] = raw
		log.Info("spec loaded", "service", name, "routes", len(table))
	}
	return routes, specs, nil
}

type ProxyDeps struct {
	Secret         string
	InternalSecret string
	Log            *slog.Logger
	Matcher        *Matcher
	Upstreams      Upstreams
	RDB            *redis.Client
	Validator      *RequestValidator
	ClientIP       func(*http.Request) string
}

// ProxyHandler verifies JWTs for annotated routes once at the edge, stamps the
// identity headers (bound to the internal secret), then reverse-proxies with
// the /api/v1/<svc> prefix stripped.
func ProxyHandler(deps ProxyDeps) func(http.Handler) http.Handler {
	proxies := map[string]*httputil.ReverseProxy{}
	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          256,
		MaxIdleConnsPerHost:   64,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: time.Second,
	}
	for name, base := range deps.Upstreams {
		target := primaryEndpoint(base)
		resilient, err := newResilientTransport(base, transport)
		if err != nil {
			deps.Log.Error("invalid upstream pool", "service", name, "err", err)
			continue
		}
		p := &httputil.ReverseProxy{
			Transport: resilient,
			Rewrite: func(pr *httputil.ProxyRequest) {
				out := pr.Out
				out.URL.Scheme = "http"
				out.URL.Host = strings.TrimPrefix(target, "http://")
				if strings.HasPrefix(target, "https://") {
					out.URL.Scheme = "https"
					out.URL.Host = strings.TrimPrefix(target, "https://")
				}
				if deps.ClientIP != nil {
					out.Header.Set("X-Forwarded-For", deps.ClientIP(pr.In))
				}
			},
			ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
				deps.Log.Error("upstream failed", "err", err, "path", r.URL.Path)
				platform.Fail(w, http.StatusServiceUnavailable, "upstream_unavailable", "the service behind this route is not responding")
			},
		}
		proxies[name] = p
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.HasPrefix(r.URL.Path, "/api/v1/") {
				next.ServeHTTP(w, r)
				return
			}

			route := deps.Matcher.Match(r.Method, r.URL.Path)
			if route == nil {
				// Not in the registry = does not exist (spec-first, fail-closed).
				platform.Fail(w, http.StatusNotFound, "not_found", "no such route in the API registry")
				return
			}
			upstream, ok := proxies[route.Service]
			if !ok {
				platform.Fail(w, http.StatusNotFound, "not_found", fmt.Sprintf("no upstream %q", route.Service))
				return
			}
			if err := deps.Validator.Validate(route.Service, r); err != nil {
				deps.Log.Warn("request schema rejected", "method", r.Method, "path", r.URL.Path, "err", err)
				var maxBytesErr *http.MaxBytesError
				if errors.As(err, &maxBytesErr) {
					platform.Fail(w, http.StatusRequestEntityTooLarge, "body_too_large", "request body exceeds the route limit")
					return
				}
				platform.Fail(w, http.StatusBadRequest, "invalid_request", "request does not match the API contract")
				return
			}

			outReq := r.Clone(r.Context())
			clearIdentity(outReq)

			if route.Perm != "" || route.AuthRequired {
				raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
				claims, err := ParseAccess(deps.Secret, raw)
				if err != nil {
					platform.Fail(w, http.StatusUnauthorized, "unauthorized", "missing or invalid access token")
					return
				}
				if deps.RDB != nil {
					version, versionErr := deps.RDB.Get(r.Context(), "claims:ver:"+claims.Sub).Int64()
					if versionErr != nil && !errors.Is(versionErr, redis.Nil) {
						if route.RateClass == "strict" {
							platform.Fail(w, http.StatusServiceUnavailable, "authorization_unavailable", "authorization state is unavailable")
							return
						}
						deps.Log.Warn("authorization version unavailable; using signed token claims", "err", versionErr)
					}
					if version > claims.Ver {
						platform.Fail(w, http.StatusUnauthorized, "stale_token", "permissions changed; sign in again")
						return
					}
				}
				if route.Perm != "" && !HasPerm(claims.Perms, route.Perm) {
					deps.Log.Warn("permission denied",
						"sub", claims.Sub, "perm", route.Perm, "path", r.URL.Path)
					platform.Fail(w, http.StatusForbidden, "forbidden", "missing permission "+route.Perm)
					return
				}
				outReq.Header.Set("X-User-Id", claims.Sub)
				outReq.Header.Set("X-Email", claims.Email)
				outReq.Header.Set("X-Permissions", strings.Join(claims.Perms, " "))
			}
			outReq.Header.Set("X-Internal-Secret", deps.InternalSecret)

			// Continue the trace into the upstream service (PLAN item 70):
			// the gateway's server span becomes the parent of theirs.
			platform.InjectTraceHeaders(outReq.Context(), outReq.Header)
			outReq.Header.Del("Authorization")
			timeout := route.Timeout
			if timeout <= 0 {
				timeout = 15 * time.Second
			}
			ctx, cancel := context.WithTimeout(outReq.Context(), timeout)
			defer cancel()
			ctx = context.WithValue(ctx, routePolicyKey{}, routePolicy{hedge: route.Hedge, stale: route.StaleIfError && !route.AuthRequired && route.Perm == ""})
			proxied := outReq.WithContext(ctx)
			if r.Method == http.MethodPost && deps.RDB != nil && r.Header.Get("Idempotency-Key") != "" {
				serveIdempotent(w, proxied, deps.RDB, proxied.Header.Get("X-User-Id"), func(target http.ResponseWriter) {
					upstream.ServeHTTP(target, proxied)
				})
				return
			}
			upstream.ServeHTTP(w, proxied)
		})
	}
}

func primaryEndpoint(raw string) string {
	if index := strings.IndexByte(raw, ','); index >= 0 {
		return raw[:index]
	}
	return raw
}

func clearIdentity(r *http.Request) {
	r.Header.Del("X-User-Id")
	r.Header.Del("X-Email")
	r.Header.Del("X-Permissions")
	r.Header.Del("X-Internal-Secret")
}
