package platform

import (
	"net/http"
	"strconv"
)

// SecurityHeaders (PLAN item 81) — helmet-parity defaults for API services.
// No CSP here on purpose: API responses are not HTML; the only HTML surface
// (gateway /docs) sets its own CSP allowing the Scalar CDN bundle.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		if r.TLS != nil {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
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
