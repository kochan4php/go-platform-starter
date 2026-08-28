package internal

import (
	"context"
	"net/http"
	"strings"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type (
	ctxKeySub   struct{}
	ctxKeyEmail struct{}
	ctxKeyPerms struct{}
)

// IdentityMiddleware validates the gateway's identity headers. Any request
// carrying X-User-Id/X-Email MUST also carry the shared internal secret —
// a leaked network position alone grants nothing (PLAN item 32).
func IdentityMiddleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sub := r.Header.Get("X-User-Id")
			if sub == "" {
				next.ServeHTTP(w, r)
				return
			}
			if secret != "" && !platform.SecretMatch(r.Header.Get("X-Internal-Secret"), secret) {
				platform.WriteError(w, platform.LoggerFromContext(r.Context()), platform.ErrForbidden("identity headers require internal secret"))
				return
			}
			ctx := r.Context()
			ctx = context.WithValue(ctx, ctxKeySub{}, sub)
			ctx = context.WithValue(ctx, ctxKeyEmail{}, r.Header.Get("X-Email"))
			ctx = context.WithValue(ctx, ctxKeyPerms{}, strings.Fields(r.Header.Get("X-Permissions")))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func PermissionsFromContext(r *http.Request) []string {
	permissions, _ := r.Context().Value(ctxKeyPerms{}).([]string)
	return permissions
}

func SubFromContext(r *http.Request) string {
	sub, _ := r.Context().Value(ctxKeySub{}).(string)
	return sub
}

func EmailFromContext(r *http.Request) string {
	email, _ := r.Context().Value(ctxKeyEmail{}).(string)
	return email
}
