package internal

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestMiddlewareRegistryHonorsConfiguredOrder(t *testing.T) {
	registry := NewMiddlewareRegistry()
	called := []string{}
	plugin := func(name string) Middleware {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = append(called, name)
				next.ServeHTTP(w, r)
			})
		}
	}
	registry.Register("one", plugin("one"))
	registry.Register("two", plugin("two"))
	chain, err := registry.Chain("one,two")
	if err != nil {
		t.Fatal(err)
	}
	chain(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = append(called, "handler") })).
		ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
	if !reflect.DeepEqual(called, []string{"one", "two", "handler"}) {
		t.Fatalf("call order = %#v", called)
	}
	if _, err := registry.Chain("missing"); err == nil {
		t.Fatal("unknown plugin accepted")
	}
}

func TestDynamicRoutingConfiguration(t *testing.T) {
	quotas, err := ParseConsumerQuotas(`{"42":75}`)
	if err != nil || quotas["42"] != 75 {
		t.Fatalf("quotas=%v err=%v", quotas, err)
	}
	routes, err := ParseWebSocketRoutes(`{"/ws/chat":"http://realtime:8080"}`, "")
	if err != nil || routes["/ws/chat"].Host != "realtime:8080" {
		t.Fatalf("routes=%v err=%v", routes, err)
	}
}

func TestSpecRouteExtensions(t *testing.T) {
	routes, err := SpecRouteTable("users", `paths:
  /users/stats:
    get:
      x-cache-ttl: 20s
      x-consumer-quota-per-minute: 40
      x-request-headers: {X-Read-Model: dashboard}
`)
	if err != nil || len(routes) != 1 {
		t.Fatalf("routes=%#v err=%v", routes, err)
	}
	if routes[0].CacheTTL.Seconds() != 20 || routes[0].ConsumerQuota != 40 || routes[0].RequestHeaders["X-Read-Model"] != "dashboard" {
		t.Fatalf("extensions not parsed: %#v", routes[0])
	}
}
