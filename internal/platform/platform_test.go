package platform

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/kochan4php/go-platform-starter/internal/testutil"
	"github.com/stretchr/testify/require"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// ---------- envelope parity (golden fixtures from the TS era) ----------

func TestSuccessEnvelopeGolden(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteSuccess(rec, http.StatusOK, "Login success", map[string]any{"accessToken": "abc"})

	var want map[string]any
	require.NoError(t, json.Unmarshal([]byte(`{"success":true,"message":"Login success","data":{"accessToken":"abc"}}`), &want))
	require.Equal(t, want, decodeBody(t, rec))
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
		{NewValidation("path: bad"), http.StatusBadRequest},
		{NewUnauthorized(""), http.StatusUnauthorized},
		{NewForbidden(""), http.StatusForbidden},
		{NewNotFound(""), http.StatusNotFound},
		{NewConflict("Email already registered"), http.StatusConflict},
		{NewInternal(errors.New("boom")), http.StatusInternalServerError},
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

// ---------- chi router + middleware ----------

func TestRequestIDEchoAndMint(t *testing.T) {
	logger := NewLogger("silent")
	r := NewRouter(logger)

	var captured string
	r.Get("/x", func(_ http.ResponseWriter, req *http.Request) {
		captured = RequestIDFromContext(req.Context())
	})

	// echo an incoming id
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set(requestIDHeader, "trace-123")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	require.Equal(t, "trace-123", rec.Header().Get(requestIDHeader))
	require.Equal(t, "trace-123", captured)

	// mint one when absent
	req = httptest.NewRequest(http.MethodGet, "/x", nil)
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	minted := rec.Header().Get(requestIDHeader)
	require.Regexp(t, uuidPattern, minted)
	require.Equal(t, minted, captured)
}

func TestRecoverHidesPanics(t *testing.T) {
	logger := NewLogger("silent")
	r := NewRouter(logger)
	r.Get("/boom", func(http.ResponseWriter, *http.Request) {
		panic("super secret panic detail")
	})

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/boom", nil))

	require.Equal(t, http.StatusInternalServerError, rec.Code)
	require.Contains(t, rec.Body.String(), "Internal Server Error")
	require.NotContains(t, rec.Body.String(), "super secret panic detail")
}

// ---------- health endpoints (chi registration) ----------

func TestHealthShapes(t *testing.T) {
	r := NewRouter(NewLogger("silent"))
	RegisterHealth(r, "db", func(context.Context) error { return nil })

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	require.Equal(t, http.StatusOK, rec.Code)
	body := decodeBody(t, rec)
	require.Equal(t, true, body["success"])
	require.Equal(t, "Health check success", body["message"])
	data := body["data"].(map[string]any)
	require.Equal(t, "UP", data["status"])
	require.Positive(t, data["uptime"].(float64))
	require.Positive(t, data["timestamp"].(float64))

	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	require.Equal(t, http.StatusOK, rec.Code)
	body = decodeBody(t, rec)
	require.Equal(t, "db is healthy", body["message"])
	require.Equal(t, true, body["data"].(map[string]any)["dbHealthy"])
}

func TestReadyzReportsFailureAs503(t *testing.T) {
	r := NewRouter(NewLogger("silent"))
	RegisterHealth(r, "redis", func(context.Context) error { return errors.New("connection refused") })

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))

	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	body := decodeBody(t, rec)
	require.Equal(t, false, body["success"])
	require.Equal(t, "redis is unhealthy", body["message"])
	// parity note: failure payloads carry diagnostics in "error", not "data"
	require.Equal(t, false, body["error"].(map[string]any)["redisHealthy"])
}

// ---------- config ----------

type testConfig struct {
	Port    int      `env:"PORT" default:"3000"`
	DSN     string   `env:"DATABASE_URL,required"`
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

// ---------- helpers ----------

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out))
	return out
}
