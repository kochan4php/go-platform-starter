package platform_test

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

func TestOKEnvelopeShape(t *testing.T) {
	rec := httptest.NewRecorder()
	platform.OK(rec, http.StatusOK, "done", map[string]string{"id": "abc"})

	got := rec.Body.String()
	want := `{"success":true,"message":"done","data":{"id":"abc"}}` + "\n"
	if got != want {
		t.Fatalf("envelope mismatch:\n got %s\nwant %s", got, want)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("content-type = %q", ct)
	}
}

func TestEnvelopeGoldenFile(t *testing.T) {
	rec := httptest.NewRecorder()
	platform.OK(rec, http.StatusOK, "done", map[string]string{"id": "abc"})
	want, err := os.ReadFile(filepath.Join("testdata", "envelope.golden"))
	if err != nil {
		t.Fatal(err)
	}
	if rec.Body.String() != string(want) {
		t.Fatalf("golden envelope drift:\n got %s\nwant %s", rec.Body.String(), want)
	}
}

func TestFailEnvelopeShape(t *testing.T) {
	rec := httptest.NewRecorder()
	platform.Fail(rec, http.StatusBadRequest, "bad_request", "name required")

	want := `{"success":false,"message":"bad_request","error":"name required"}` + "\n"
	if rec.Body.String() != want {
		t.Fatalf("envelope mismatch:\n got %s", rec.Body.String())
	}
}

func TestWriteErrorMapping(t *testing.T) {
	cases := []struct {
		name   string
		err    error
		status int
		body   string
	}{
		{"conflict", platform.ErrConflict("email %q exists", "a@b.c"), 409, `{"success":false,"message":"conflict","error":"email \"a@b.c\" exists"}` + "\n"},
		{"notfound", platform.ErrNotFound("user %d", 7), 404, `{"success":false,"message":"not_found","error":"user 7"}` + "\n"},
		{"internal hides detail", errors.New("db exploded"), 500, `{"success":false,"message":"internal_server_error","error":""}` + "\n"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			platform.WriteError(rec, discardLogger(), tc.err)
			if rec.Code != tc.status {
				t.Fatalf("status = %d, want %d", rec.Code, tc.status)
			}
			if rec.Body.String() != tc.body {
				t.Fatalf("body:\n got %s\nwant %s", rec.Body.String(), tc.body)
			}
		})
	}
}

func discardLogger() *slog.Logger { return newLogger() }

func TestParsePagination(t *testing.T) {
	mk := func(q string) *http.Request {
		r := httptest.NewRequest(http.MethodGet, "/items"+q, nil)
		return r
	}

	limit, offset, err := platform.ParsePagination(mk(""))
	if limit != 10 || offset != 0 || err != nil {
		t.Fatalf("defaults: %d %d %v", limit, offset, err)
	}

	limit, _, err = platform.ParsePagination(mk("?limit=1000&offset=5"))
	if err != nil || limit != 100 {
		t.Fatalf("clamp: %d %v", limit, err)
	}

	if _, _, err := platform.ParsePagination(mk("?limit=-3")); err == nil {
		t.Fatal("negative limit should error")
	}
	if _, _, err := platform.ParsePagination(mk("?offset=abc")); err == nil {
		t.Fatal("non-numeric offset should error")
	}
}

func TestListOKShape(t *testing.T) {
	rec := httptest.NewRecorder()
	platform.ListOK(rec, "listed", []string{"a"}, platform.Meta{Limit: 10, Offset: 0, Total: 1})

	want := `{"success":true,"message":"listed","data":{"items":["a"],"meta":{"limit":10,"offset":0,"total":1}}}` + "\n"
	if rec.Body.String() != want {
		t.Fatalf("list envelope:\n got %s", rec.Body.String())
	}
}

func TestPaginationLinks(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/items?limit=10&offset=10&q=a", nil)
	meta := platform.Meta{Limit: 10, Offset: 10, Total: 25}
	platform.SetPaginationLinks(req, &meta)
	if meta.Next != "/items?limit=10&offset=20&q=a" || meta.Prev != "/items?limit=10&offset=0&q=a" {
		t.Fatalf("links = next %q prev %q", meta.Next, meta.Prev)
	}
}

func TestCorrelationIDMiddleware(t *testing.T) {
	nextCalled := false
	h := platform.CorrelationID(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		if platform.RequestIDFromContext(r.Context()) == "" {
			t.Error("request id missing from context")
		}
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-ID", "given-id")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if !nextCalled {
		t.Fatal("handler not called")
	}
	if rec.Header().Get("X-Request-ID") != "given-id" {
		t.Fatalf("existing request id not preserved: %q", rec.Header().Get("X-Request-ID"))
	}

	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, httptest.NewRequest(http.MethodGet, "/", nil))
	if len(rec2.Header().Get("X-Request-ID")) != 24 {
		t.Fatalf("generated id length = %d, want 24 hex chars", len(rec2.Header().Get("X-Request-ID")))
	}

	rec3 := httptest.NewRecorder()
	bad := httptest.NewRequest(http.MethodGet, "/", nil)
	bad.Header.Set("X-Request-ID", "injected\r\nX-Evil: yes")
	h.ServeHTTP(rec3, bad)
	if got := rec3.Header().Get("X-Request-ID"); len(got) != 24 || got == bad.Header.Get("X-Request-ID") {
		t.Fatalf("unsafe request id was echoed: %q", got)
	}
}

func TestSecurityPrimitives(t *testing.T) {
	if !platform.SecretMatch("old", "new,old") || platform.SecretMatch("nope", "new,old") {
		t.Fatal("secret rotation ring mismatch")
	}
	ciphertext, err := platform.EncryptForSubject("master", "42", "mfa", "secret")
	if err != nil {
		t.Fatal(err)
	}
	plaintext, err := platform.DecryptForSubject("next,master", "42", "mfa", ciphertext)
	if err != nil || plaintext != "secret" {
		t.Fatalf("decrypt = %q, %v", plaintext, err)
	}
	digest := platform.KeyedDigest("key", "token")
	if !platform.VerifyDigest("next,key", "token", digest) || platform.VerifyDigest("key", "other", digest) {
		t.Fatal("keyed digest verification mismatch")
	}
	for _, raw := range []string{"http://example.com/a", "https://127.0.0.1/a", "javascript:alert(1)", "data:image/png,x"} {
		if platform.ValidatePublicHTTPSURL(raw) == nil {
			t.Fatalf("unsafe URL accepted: %s", raw)
		}
	}
	if err := platform.ValidatePublicHTTPSURL("https://cdn.example.com/avatar.png"); err != nil {
		t.Fatal(err)
	}
}

func TestStreamMessageSigningAndEncryption(t *testing.T) {
	t.Setenv("STREAM_SIGNING_KEYS", "active-signing,previous-signing")
	t.Setenv("STREAM_ENCRYPTION_KEYS", "active-encryption,previous-encryption")

	payload, err := platform.EncryptForSubject("active-encryption", "audit.events", "audit.entry", `{"action":"login"}`)
	if err != nil {
		t.Fatal(err)
	}
	values := map[string]any{
		"event": "audit.entry", "payload": payload, "encrypted": "1",
		"signature": platform.KeyedDigest("active-signing", "audit.events\naudit.entry\n"+payload),
	}
	event, decoded, err := platform.DecodeStreamMessage("audit.events", values)
	if err != nil || event != "audit.entry" || decoded != `{"action":"login"}` {
		t.Fatalf("decoded event = %q %q, err=%v", event, decoded, err)
	}
	values["payload"] = payload + "tampered"
	if _, _, err := platform.DecodeStreamMessage("audit.events", values); err == nil {
		t.Fatal("tampered signed payload accepted")
	}
	if _, _, err := platform.DecodeStreamMessage("audit.events", map[string]any{"payload": payload}); err == nil {
		t.Fatal("stream message without event accepted")
	}
}

func TestRecoverer(t *testing.T) {
	h := platform.Recoverer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	}))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `"success":false`) {
		t.Fatalf("body = %s", rec.Body.String())
	}
}

func TestReadyz(t *testing.T) {
	ok := platform.Readyz(map[string]platform.Checker{
		"db": func(ctx context.Context) error { return nil },
	})
	rec := httptest.NewRecorder()
	ok(rec, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("all-ok readyz status = %d", rec.Code)
	}

	fail := platform.Readyz(map[string]platform.Checker{
		"db":    func(ctx context.Context) error { return nil },
		"redis": func(ctx context.Context) error { return errors.New("conn refused") },
	})
	rec2 := httptest.NewRecorder()
	fail(rec2, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if rec2.Code != http.StatusServiceUnavailable {
		t.Fatalf("failing readyz status = %d", rec2.Code)
	}
	if !strings.Contains(rec2.Body.String(), `"redis":{"error":"conn refused","latencyMs":`) {
		t.Fatalf("body = %s", rec2.Body.String())
	}
}

func TestHealthDetailAndVersion(t *testing.T) {
	t.Setenv("APP_VERSION", "1.2.3")
	t.Setenv("GIT_COMMIT", "abc123")
	detail := httptest.NewRecorder()
	platform.Healthz(detail, httptest.NewRequest(http.MethodGet, "/healthz?detail=1", nil))
	if !strings.Contains(detail.Body.String(), `"goVersion"`) || !strings.Contains(detail.Body.String(), `"version":"1.2.3"`) {
		t.Fatalf("detail health = %s", detail.Body.String())
	}
	version := httptest.NewRecorder()
	platform.Version(version, httptest.NewRequest(http.MethodGet, "/version", nil))
	if !strings.Contains(version.Body.String(), `"commit":"abc123"`) {
		t.Fatalf("version = %s", version.Body.String())
	}
}

func TestBuildMIME(t *testing.T) {
	raw := platform.BuildMIME("Platform", "noreply@example.local", platform.Mail{
		To: "a@b.c", Subject: "Hi", HTML: "<b>hi</b>",
	})
	s := string(raw)
	for _, want := range []string{"From: Platform <noreply@example.local>\r\n", "To: a@b.c\r\n", "Subject: Hi\r\n", "<b>hi</b>"} {
		if !strings.Contains(s, want) {
			t.Fatalf("mime missing %q:\n%s", want, s)
		}
	}
}

func TestLoadDotEnv(t *testing.T) {
	t.Setenv("EXISTING", "wins")
	path := t.TempDir() + "/.env"
	content := "# comment\nA=1\nexport B=\"two words\"\nEXISTING=ignored\nBADLINE\nC=3 # trailing\n"
	if err := writeFile(path, content); err != nil {
		t.Fatal(err)
	}
	if err := platform.LoadDotEnv(path); err != nil {
		t.Fatal(err)
	}
	for k, want := range map[string]string{"A": "1", "B": "two words", "EXISTING": "wins", "C": "3"} {
		if got := envGet(k); got != want {
			t.Fatalf("%s = %q, want %q", k, got, want)
		}
	}
	if err := platform.LoadDotEnv(t.TempDir() + "/missing.env"); err != nil {
		t.Fatalf("missing file should be a no-op, got %v", err)
	}
}

func TestSecretFileEnvAdapter(t *testing.T) {
	path := filepath.Join(t.TempDir(), "secret")
	if err := os.WriteFile(path, []byte("from-file\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PLATFORM_TEST_SECRET_FILE", path)
	t.Setenv("PLATFORM_TEST_SECRET", "")
	_ = os.Unsetenv("PLATFORM_TEST_SECRET")
	type config struct {
		Secret string `env:"PLATFORM_TEST_SECRET,required"`
	}
	got := platform.MustParseEnv[config]()
	if got.Secret != "from-file" {
		t.Fatalf("secret = %q", got.Secret)
	}
}

func TestSecretFileEnvAdapterIgnoresOptionalAppEnvFile(t *testing.T) {
	t.Setenv("APP_ENV_FILE", filepath.Join(t.TempDir(), "missing.env"))
	_ = platform.MustParseEnv[struct{}]()
}

func TestGormLoggerTrace(t *testing.T) {
	gl := platform.NewGormLogger(newLogger(), 50*time.Millisecond)
	if gl == nil {
		t.Fatal("nil logger interface")
	}
	if gl.LogMode(1) == nil {
		t.Fatal("LogMode must return an interface")
	}
	gl.Error(context.Background(), "x")
}
