package platform_test

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
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
	if !strings.Contains(rec2.Body.String(), `"redis":"fail: conn refused"`) {
		t.Fatalf("body = %s", rec2.Body.String())
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
