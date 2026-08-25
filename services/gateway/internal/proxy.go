package internal

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"strings"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

// LoadSpecs fetches every upstream's /openapi.json, builds the route table
// and fails closed: an unreachable spec or an unknown permission aborts boot.
func LoadSpecs(ctx context.Context, upstreams Upstreams, log *slog.Logger) ([]Route, map[string][]byte, error) {
	hc := &http.Client{Timeout: 5 * time.Second}
	routes := make([]Route, 0, 32)
	specs := make(map[string][]byte, len(upstreams))

	for name, base := range upstreams {
		var raw []byte
		var lastErr error
		for attempt := 1; attempt <= 5; attempt++ {
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
			time.Sleep(time.Duration(attempt) * time.Second)
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
	Secret         []byte
	InternalSecret string
	Log            *slog.Logger
	Matcher        *Matcher
	Upstreams      Upstreams
}

// ProxyHandler verifies JWTs for annotated routes once at the edge, stamps the
// identity headers (bound to the internal secret), then reverse-proxies with
// the /api/v1/<svc> prefix stripped.
func ProxyHandler(deps ProxyDeps) func(http.Handler) http.Handler {
	proxies := map[string]*httputil.ReverseProxy{}
	for name, base := range deps.Upstreams {
		target := base
		p := &httputil.ReverseProxy{
			Rewrite: func(pr *httputil.ProxyRequest) {
				out := pr.Out
				out.URL.Scheme = "http"
				out.URL.Host = strings.TrimPrefix(target, "http://")
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

			outReq := r.Clone(r.Context())
			clearIdentity(outReq)

			if route.Perm != "" || route.AuthRequired {
				raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
				claims, err := ParseAccess(deps.Secret, raw)
				if err != nil {
					platform.Fail(w, http.StatusUnauthorized, "unauthorized", "missing or invalid access token")
					return
				}
				if route.Perm != "" && !HasPerm(claims.Perms, route.Perm) {
					deps.Log.Warn("permission denied",
						"sub", claims.Sub, "perm", route.Perm, "path", r.URL.Path)
					platform.Fail(w, http.StatusForbidden, "forbidden", "missing permission "+route.Perm)
					return
				}
				outReq.Header.Set("X-User-Id", claims.Sub)
				outReq.Header.Set("X-Email", claims.Email)
			}
			outReq.Header.Set("X-Internal-Secret", deps.InternalSecret)

			// Continue the trace into the upstream service (PLAN item 70):
			// the gateway's server span becomes the parent of theirs.
			platform.InjectTraceHeaders(outReq.Context(), outReq.Header)
			outReq.Header.Del("Authorization")
			upstream.ServeHTTP(w, outReq)
		})
	}
}

func clearIdentity(r *http.Request) {
	r.Header.Del("X-User-Id")
	r.Header.Del("X-Email")
	r.Header.Del("X-Internal-Secret")
}
