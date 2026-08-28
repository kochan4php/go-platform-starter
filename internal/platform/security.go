package platform

import (
	"crypto/subtle"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

// SecurityHeaders provides helmet-parity defaults for API services. API
// responses deny every content source; the gateway's HTML docs handler
// replaces this CSP with a narrowly scoped Scalar policy.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		h.Set("Cross-Origin-Opener-Policy", "same-origin")
		h.Set("Cross-Origin-Resource-Policy", "same-site")
		h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
		if r.TLS != nil {
			h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		}
		next.ServeHTTP(w, r)
	})
}

// SecretMatch checks a presented secret against a comma-separated active +
// previous key ring without leaking which key matched. This enables zero-downtime
// rotation: deploy readers with both keys, switch writers, then remove the old key.
func SecretMatch(presented, keyRing string) bool {
	matched := 0
	for _, candidate := range strings.Split(keyRing, ",") {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		matched |= subtle.ConstantTimeCompare([]byte(presented), []byte(candidate))
	}
	return matched == 1
}

// ActiveSecret returns the first secret in a rotation key ring.
func ActiveSecret(keyRing string) string {
	for _, candidate := range strings.Split(keyRing, ",") {
		if candidate = strings.TrimSpace(candidate); candidate != "" {
			return candidate
		}
	}
	return ""
}

// ValidatePublicHTTPSURL rejects script/data schemes, credentials, localhost,
// and literal private/link-local addresses. No service currently fetches avatar
// URLs; this guard must also run before any future server-side fetch.
func ValidatePublicHTTPSURL(raw string) error {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	u, err := url.ParseRequestURI(raw)
	if err != nil || !strings.EqualFold(u.Scheme, "https") || u.Hostname() == "" || u.User != nil {
		return ErrBadRequest("avatarUrl must be an absolute public https URL")
	}
	host := strings.ToLower(strings.TrimSuffix(u.Hostname(), "."))
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return ErrBadRequest("avatarUrl must not target localhost")
	}
	if ip := net.ParseIP(host); ip != nil && (ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified()) {
		return ErrBadRequest("avatarUrl must not target a private address")
	}
	return nil
}

// Deprecation (PLAN item 85) marks a handler's response as deprecated per
// RFC 9745: call before writing the body. Pass the unix timestamp of when
// the route was deprecated as `at` ("@" prefix added here); sunset may be an
// HTTP-date or empty. See docs/API_VERSIONING.md for the freeze policy.
func Deprecation(w http.ResponseWriter, at int64, sunset string) {
	w.Header().Set("Deprecation", "@"+strconv.FormatInt(at, 10))
	if sunset != "" {
		w.Header().Set("Sunset", sunset)
	}
}
