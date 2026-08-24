package internal

import (
	"net/http"
	"strings"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

// RequireBearer enforces a valid access token on /sessions* paths only
// (the other endpoints are public by design). On success it stores the
// subject and — when present — the hashed refresh cookie for downstream use.
func RequireBearer(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/api/v1")
			if !strings.HasPrefix(path, "/sessions") {
				next.ServeHTTP(w, r)
				return
			}

			raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if raw == "" {
				platform.WriteError(w, platform.LoggerFromContext(r.Context()), platform.ErrUnauthorized("missing bearer token"))
				return
			}
			claims, err := ParseToken(secret, raw, PurposeAccess)
			if err != nil || claims.Sub == "" {
				platform.WriteError(w, platform.LoggerFromContext(r.Context()), platform.ErrUnauthorized("invalid access token"))
				return
			}

			hash := ""
			if c, cerr := r.Cookie(cookieName); cerr == nil && c.Value != "" {
				hash = sha256Hex(c.Value)
			}
			next.ServeHTTP(w, withAuthScope(r, claims.Sub, hash))
		})
	}
}
