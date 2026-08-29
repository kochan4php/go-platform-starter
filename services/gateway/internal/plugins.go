package internal

import (
	"fmt"
	"net/http"
	"strings"
)

type Middleware func(http.Handler) http.Handler

type MiddlewareRegistry struct {
	order   []string
	plugins map[string]Middleware
}

func NewMiddlewareRegistry() *MiddlewareRegistry {
	return &MiddlewareRegistry{plugins: map[string]Middleware{}}
}

func (r *MiddlewareRegistry) Register(name string, middleware Middleware) {
	if strings.TrimSpace(name) == "" || middleware == nil {
		panic("gateway middleware requires name and function")
	}
	if _, exists := r.plugins[name]; !exists {
		r.order = append(r.order, name)
	}
	r.plugins[name] = middleware
}

func (r *MiddlewareRegistry) Chain(enabledCSV string) (Middleware, error) {
	enabled := map[string]bool{}
	for _, name := range strings.Split(enabledCSV, ",") {
		if name = strings.TrimSpace(name); name != "" {
			enabled[name] = true
		}
	}
	for name := range enabled {
		if _, exists := r.plugins[name]; !exists {
			return nil, fmt.Errorf("unknown gateway middleware %q", name)
		}
	}
	return func(next http.Handler) http.Handler {
		for i := len(r.order) - 1; i >= 0; i-- {
			if enabled[r.order[i]] {
				next = r.plugins[r.order[i]](next)
			}
		}
		return next
	}, nil
}
