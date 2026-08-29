package internal

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRefreshCookieUsesBrowserCSRFProtections(t *testing.T) {
	h := NewHandlers(nil, Config{RefreshTTLDays: 7, CookieSecure: true}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	recorder := httptest.NewRecorder()
	h.setRefreshCookie(recorder, "opaque")
	cookies := recorder.Result().Cookies()
	if len(cookies) != 1 || !cookies[0].HttpOnly || !cookies[0].Secure || cookies[0].SameSite != http.SameSiteLaxMode {
		t.Fatalf("unsafe refresh cookie: %#v", cookies)
	}
}
