package internal

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

// RequireSessionIdentity enforces edge-established identity on /auth/sessions*
// paths (PLAN item 32 contract: services never re-verify tokens — the gateway
// verified the JWT, stripped Authorization, and forwarded X-User-Id bound by
// the shared internal secret). A leaked network position alone grants nothing.
// The refresh cookie rides along untouched for current-session attribution.
func RequireSessionIdentity(internalSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/api/v1")
			if !strings.HasPrefix(path, "/auth/sessions") {
				next.ServeHTTP(w, r)
				return
			}

			sub := r.Header.Get("X-User-Id")
			okSecret := subtle.ConstantTimeCompare(
				[]byte(r.Header.Get("X-Internal-Secret")), []byte(internalSecret)) == 1
			if !okSecret || sub == "" {
				platform.WriteError(w, platform.LoggerFromContext(r.Context()),
					platform.ErrUnauthorized("missing identity"))
				return
			}

			hash := ""
			if c, cerr := r.Cookie(cookieName); cerr == nil && c.Value != "" {
				hash = sha256Hex(c.Value)
			}
			next.ServeHTTP(w, withAuthScope(r, sub, hash))
		})
	}
}
