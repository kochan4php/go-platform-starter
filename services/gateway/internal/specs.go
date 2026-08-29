package internal

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform/permissions"
	"gopkg.in/yaml.v3"
)

type Upstreams map[string]string

func ParseUpstreams(raw string) (Upstreams, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, fmt.Errorf("UPSTREAMS is required")
	}
	var u Upstreams
	if err := json.Unmarshal([]byte(raw), &u); err != nil {
		return nil, fmt.Errorf("UPSTREAMS must be JSON {\"name\":\"url\"}: %w", err)
	}
	for name, url := range u {
		endpoints := strings.Split(url, ",")
		for i := range endpoints {
			endpoints[i] = strings.TrimRight(strings.TrimSpace(endpoints[i]), "/")
			if !strings.HasPrefix(endpoints[i], "http://") && !strings.HasPrefix(endpoints[i], "https://") {
				return nil, fmt.Errorf("upstream %s url must start with http(s)", name)
			}
		}
		u[name] = strings.Join(endpoints, ",")
	}
	return u, nil
}

type Route struct {
	Method         string
	Path           string // gateway-facing: /api/v1/<svc><spec-path>
	Service        string
	Perm           string // x-required-permission value ("" = none)
	AuthRequired   bool   // x-auth: required
	RateClass      string
	BodyLimit      int64
	Timeout        time.Duration
	Hedge          bool
	StaleIfError   bool
	CacheTTL       time.Duration
	ConsumerQuota  int
	RequestHeaders map[string]string
}

// SpecRouteTable parses an upstream's OpenAPI YAML and produces the gateway-
// facing route table. Unknown permissions are rejected here — the gateway
// refuses to boot with a dead protected route (fail-closed, PLAN item 33).
func SpecRouteTable(service, rawSpec string) ([]Route, error) {
	var doc struct {
		Paths map[string]map[string]map[string]any `yaml:"paths"`
	}
	if err := yaml.Unmarshal([]byte(rawSpec), &doc); err != nil {
		return nil, fmt.Errorf("parse %s spec: %w", service, err)
	}

	prefix := "/api/v1"
	routes := make([]Route, 0, len(doc.Paths)*2)
	for path, methods := range doc.Paths {
		for method, op := range methods {
			switch strings.ToUpper(method) {
			case httpMethodsGet, httpMethodsPost, httpMethodsPut, httpMethodsPatch, httpMethodsDelete:
			default:
				continue
			}
			route := Route{
				Method:    strings.ToUpper(method),
				Path:      prefix + path,
				Service:   service,
				RateClass: "standard",
				BodyLimit: 1 << 20,
				Timeout:   15 * time.Second,
			}
			if op != nil {
				if p, ok := op["x-required-permission"].(string); ok {
					route.Perm = p
				}
				if v, ok := op["x-auth"].(string); ok && v == "required" {
					route.AuthRequired = true
				}
				if v, ok := op["x-rate-limit-class"].(string); ok && v != "" {
					route.RateClass = v
				}
				if v, ok := op["x-request-body-limit"].(int); ok && v > 0 {
					route.BodyLimit = int64(v)
				}
				if v, ok := op["x-timeout"].(string); ok {
					if timeout, err := time.ParseDuration(v); err == nil && timeout > 0 {
						route.Timeout = timeout
					}
				}
				route.Hedge, _ = op["x-hedge"].(bool)
				route.StaleIfError, _ = op["x-stale-if-error"].(bool)
				if v, ok := op["x-cache-ttl"].(string); ok {
					if ttl, err := time.ParseDuration(v); err == nil && ttl > 0 {
						route.CacheTTL = ttl
					}
				}
				if v, ok := op["x-consumer-quota-per-minute"].(int); ok && v > 0 {
					route.ConsumerQuota = v
				}
				if headers, ok := op["x-request-headers"].(map[string]any); ok {
					route.RequestHeaders = map[string]string{}
					for name, value := range headers {
						lower := strings.ToLower(name)
						if lower == "authorization" || lower == "x-internal-secret" || strings.HasPrefix(lower, "x-user-") {
							return nil, fmt.Errorf("request transformation may not set reserved header %q", name)
						}
						if text, ok := value.(string); ok {
							route.RequestHeaders[name] = text
						}
					}
				}
				if _, internalOnly := op["x-internal"]; internalOnly {
					continue // internal APIs are never exposed through the gateway
				}
			}
			if route.Perm != "" && !permissions.IsValid(route.Perm) {
				return nil, fmt.Errorf(
					"permission %q (%s %s) is not in the compile-time catalog — refusing to boot",
					route.Perm, route.Method, route.Path)
			}
			routes = append(routes, route)
		}
	}
	return routes, nil
}

const (
	httpMethodsGet    = "GET"
	httpMethodsPost   = "POST"
	httpMethodsPut    = "PUT"
	httpMethodsPatch  = "PATCH"
	httpMethodsDelete = "DELETE"
)

// Matcher resolves a request to its annotated route in O(n) over the table —
// fine at starter scale, swap to a radix tree if the API surface explodes.
type Matcher struct {
	routes []Route
}

func NewMatcher(routes []Route) *Matcher { return &Matcher{routes: routes} }

func (m *Matcher) Match(method, actualPath string) *Route {
	reqSegs := strings.Split(strings.Trim(actualPath, "/"), "/")
	for i := range m.routes {
		r := &m.routes[i]
		if r.Method != method {
			continue
		}
		wantSegs := strings.Split(strings.Trim(r.Path, "/"), "/")
		if len(wantSegs) != len(reqSegs) {
			continue
		}
		matched := true
		for j, want := range wantSegs {
			if strings.HasPrefix(want, "{") && strings.HasSuffix(want, "}") {
				if reqSegs[j] == "" {
					matched = false
					break
				}
				continue
			}
			if want != reqSegs[j] {
				matched = false
				break
			}
		}
		if matched {
			return r
		}
	}
	return nil
}

func normalizePath(p string) string {
	if len(p) > 1 && strings.HasSuffix(p, "/") {
		return p[:len(p)-1]
	}
	return p
}
