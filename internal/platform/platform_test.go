package platform

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/kochan4php/express-ts-starter/internal/testutil"
	"github.com/stretchr/testify/require"
)

// ---------- envelope parity (golden fixtures from the TS era) ----------

func TestSuccessEnvelopeGolden(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteSuccess(rec, http.StatusOK, "Login success", map[string]any{"accessToken": "abc"})

	var got, want map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
	require.NoError(t, json.Unmarshal([]byte(`{"success":true,"message":"Login success","data":{"accessToken":"abc"}}`), &want))
	require.Equal(t, want, got)
	require.Equal(t, contentTypeJSON, rec.Header().Get("Content-Type"))
}

func TestFailedEnvelopeForbiddenGolden(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteAppError(rec, context.Background(), NewForbidden("You do not have the required permission: user:read:any"))
	testutil.Golden(t, "envelope_failed_forbidden.json", rec.Body.Bytes())
}

func TestInternalErrorsAreHidden(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteAppError(rec, context.Background(), NewInternal(errors.New("database password is hunter2")))

	testutil.Golden(t, "envelope_failed_internal.json", rec.Body.Bytes())
	require.NotContains(t, rec.Body.String(), "hunter2", "internal detail must never leak")
}

func TestDataOmittedWhenNil(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteSuccess(rec, http.StatusCreated, "Logout success", nil)
	require.JSONEq(t, `{"success":true,"message":"Logout success"}`, rec.Body.String())
}

// ---------- error taxonomy ----------

func TestErrorStatusMapping(t *testing.T) {
	cases := []struct {
		err    error
		status int
	}{
		{NewValidation("path: bad"), 400},
		{NewUnauthorized(""), 401},
		{NewForbidden(""), 403},
		{NewNotFound(""), 404},
		{NewConflict("Email already registered"), 409},
		{NewInternal(errors.New("boom")), 500},
	}
	for _, tc := range cases {
		rec := httptest.NewRecorder()
		WriteAppError(rec, context.Background(), tc.err)
		require.Equal(t, tc.status, rec.Code)
	}
}

func TestUnknownErrorsBecomeOpaque500(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteAppError(rec, context.Background(), errors.New("secret internal state"))
	require.Equal(t, http.StatusInternalServerError, rec.Code)
	require.NotContains(t, rec.Body.String(), "secret internal state")
}

// ---------- middleware ----------

func TestRequestIDEchoAndMint(t *testing.T) {
	logger := NewLogger("silent")

	handler := Chain(RequestLogger(logger))(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	echoReq := httptest.NewRequest("GET", "/x", nil)
	echoReq.Header.Set(requestIDHeader, "trace-123")
	echo2 := httptest.NewRecorder()
	handler.ServeHTTP(echo2, echoReq)
	require.Equal(t, "trace-123", echo2.Header().Get(requestIDHeader))

	minted := httptest.NewRecorder()
	mintedReq := httptest.NewRequest("GET", "/x", nil)
	var gotID string
	bare := Chain(RequestLogger(logger))(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		gotID = RequestIDFromContext(r.Context())
	}))
	bare.ServeHTTP(minted, mintedReq)
	require.Equal(t, minted.Header().Get(requestIDHeader), gotID)
	require.Regexp(t, regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`), gotID)
}

func TestRecoverHidesPanics(t *testing.T) {
	logger := NewLogger("silent")
	handler := Chain(Recover(logger))(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("super secret panic detail")
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))

	require.Equal(t, http.StatusInternalServerError, rec.Code)
	require.Contains(t, rec.Body.String(), "Internal Server Error")
	require.NotContains(t, rec.Body.String(), "super secret panic detail")
}

// ---------- config ----------

type testConfig struct {
	Port    int      `env:"PORT" default:"3000"`
	DSN     string   `env:"DATABASE_URL,required"`
	TTL     string   `env:"ACCESS_TOKEN_TTL" default:"5h"`
	Domains []string `env:"TRUSTED_DOMAINS"`
}

func TestConfigDefaultsAndCoercion(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://x:x@localhost/x")
	t.Setenv("TRUSTED_DOMAINS", " http://a.com , http://b.com ")

	cfg, err := Load[testConfig]()
	require.NoError(t, err)
	require.Equal(t, 3000, cfg.Port)
	require.Equal(t, []string{"http://a.com", "http://b.com"}, cfg.Domains)
}

func TestConfigMissingRequiredIsReadable(t *testing.T) {
	_, err := Load[testConfig]()
	require.Error(t, err)
	require.Contains(t, err.Error(), "DATABASE_URL: required but missing")
	require.Contains(t, err.Error(), "Invalid configuration")
}
