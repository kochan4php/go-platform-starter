package internal_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/testutil"
	internal "github.com/kochan4php/go-platform-starter/services/auth/internal"
)

// --- test scaffolding -------------------------------------------------------

type capturedPublisher struct {
	events []capturedEvent
}

type capturedEvent struct {
	Stream  string
	Event   string
	Payload map[string]string
}

func (p *capturedPublisher) Publish(_ context.Context, stream, event string, payload any) error {
	raw, _ := json.Marshal(payload)
	m := map[string]string{}
	_ = json.Unmarshal(raw, &m)
	p.events = append(p.events, capturedEvent{Stream: stream, Event: event, Payload: m})
	return nil
}

func (p *capturedPublisher) lastPayload(stream, event string) map[string]string {
	for i := len(p.events) - 1; i >= 0; i-- {
		if p.events[i].Stream == stream && p.events[i].Event == event {
			return p.events[i].Payload
		}
	}
	return nil
}

type fixture struct {
	svc *internal.Service
	pub *capturedPublisher
	rdb *redis.Client
}

func newFixture(t *testing.T) *fixture {
	t.Helper()
	dsn := testutil.StartPostgres(t)
	addr := testutil.StartRedis(t)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	if err := retryUntil(func() error { return internal.MigrateUp(dsn) }, 20*time.Second); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: platform.NewGormLogger(log, time.Minute),
	})
	if err != nil {
		t.Fatalf("gorm: %v", err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: addr})
	t.Cleanup(func() { _ = rdb.Close() })

	cfg := internal.Config{
		AccessTokenSecret:   "test-secret-at-least-16ch!",
		AccessTTLMinutes:    30,
		RefreshTTLDays:      7,
		BcryptCost:          4,
		LoginMaxAttempts:    3,
		LoginLockMinutes:    15,
		ResetTTLMinutes:     15,
		AppPublicURL:        "http://localhost:5173",
		RateGlobalPerMinute: 1000,
		RateStrictPerMinute: 1000,
	}
	pub := &capturedPublisher{}
	return &fixture{svc: internal.NewService(db, rdb, log, cfg, pub), pub: pub, rdb: rdb}
}

func mustRegister(t *testing.T, f *fixture, email string) {
	t.Helper()
	if _, err := f.svc.Register(context.Background(), email, "password-123"); err != nil {
		t.Fatalf("register %s: %v", email, err)
	}
}

func retryUntil(fn func() error, within time.Duration) error {
	deadline := time.Now().Add(within)
	for {
		err := fn()
		if err == nil {
			return nil
		}
		if !time.Now().After(deadline) {
			time.Sleep(500 * time.Millisecond)
			continue
		}
		return err
	}
}

func resetTokenFromMail(t *testing.T, f *fixture) string {
	t.Helper()
	payload := f.pub.lastPayload(internal.StreamMail, internal.EventSend)
	if payload == nil {
		t.Fatal("no mail job published")
	}
	var html struct {
		Html string `json:"html"`
	}
	if err := json.Unmarshal([]byte(payload["html"]), &html); err == nil && html.Html != "" {
		t.Fatal("unexpected html encoding")
	}
	link := payload["html"]
	i := indexOf(link, "token=")
	if i < 0 {
		t.Fatalf("no token in mail html: %s", link)
	}
	token := link[i+len("token="):]
	if end := indexOf(token, "\""); end >= 0 {
		token = token[:end]
	}
	return token
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

// --- tests ------------------------------------------------------------------

func TestRegisterEmitsUserCreatedAndRejectsDuplicates(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()

	mustRegister(t, f, "Ada@example.local")

	ev := f.pub.lastPayload(internal.StreamUsers, internal.EventCreated)
	if ev == nil || ev["email"] != "ada@example.local" || ev["sub"] == "" {
		t.Fatalf("user.created payload wrong: %+v", ev)
	}

	_, err := f.svc.Register(ctx, "ada@example.local", "password-123")
	if err == nil {
		t.Fatal("duplicate register must fail")
	}
	appErr, ok := err.(*platform.AppError)
	if !ok || appErr.Status != 409 {
		t.Fatalf("want 409 conflict, got %#v", err)
	}
}

func TestLoginIsUniformForUnknownWrongAndLocked(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	mustRegister(t, f, "bob@example.local")

	cases := []struct{ name, email, pw string }{
		{"unknown user", "nobody@example.local", "whatever-123"},
		{"wrong password", "bob@example.local", "wrong-password"},
	}
	var firstErrBody string
	for _, tc := range cases {
		_, err := f.svc.Login(ctx, tc.email, tc.pw, "test-agent", "10.0.0.1")
		if err == nil {
			t.Fatalf("%s should fail", tc.name)
		}
		body := err.Error()
		if firstErrBody == "" {
			firstErrBody = body
			continue
		}
		if body != firstErrBody {
			t.Fatalf("%s response not uniform:\n%s\n%s", tc.name, body, firstErrBody)
		}
	}

	for i := 0; i < 3; i++ {
		_, _ = f.svc.Login(ctx, "bob@example.local", "wrong-password", "a", "b")
	}
	_, err := f.svc.Login(ctx, "bob@example.local", "password-123", "a", "b")
	if err == nil {
		t.Fatal("locked account with correct password must still fail")
	}
	appErr := err.(*platform.AppError)
	if appErr.Status != 401 || appErr.Message != "invalid_credentials" {
		t.Fatalf("locked response must stay uniform 401 invalid_credentials, got %#v", appErr)
	}
}

func TestRefreshRotationAndReuseDetection(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	mustRegister(t, f, "carol@example.local")

	login, err := f.svc.Login(ctx, "carol@example.local", "password-123", "ua", "ip")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	res1, err := f.svc.Refresh(ctx, login.RefreshCookie)
	if err != nil {
		t.Fatalf("first refresh: %v", err)
	}
	if res1.RefreshCookie == "" || res1.AccessToken == "" || res1.FamilyID != login.FamilyID {
		t.Fatalf("rotated result incomplete: %+v", res1)
	}

	if _, err := f.svc.Refresh(ctx, login.RefreshCookie); err == nil {
		t.Fatal("replayed old refresh token must fail")
	}

	if _, err := f.svc.Refresh(ctx, res1.RefreshCookie); err == nil {
		t.Fatal("refresh after family kill must fail even with the newest token")
	}
}

func TestLogoutRevokesSession(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	mustRegister(t, f, "dave@example.local")

	login, _ := f.svc.Login(ctx, "dave@example.local", "password-123", "ua", "ip")
	if _, err := f.svc.Refresh(ctx, login.RefreshCookie); err != nil {
		t.Fatalf("pre-logout refresh: %v", err)
	}
	if err := f.svc.Logout(ctx, login.RefreshCookie); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := f.svc.Refresh(ctx, login.RefreshCookie); err == nil {
		t.Fatal("refresh after logout must fail")
	}
}

func TestForgotIsUniformAndResetIsSingleUseAndWipesSessions(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	mustRegister(t, f, "erin@example.local")

	if err := f.svc.Forgot(ctx, "ghost@example.local"); err != nil {
		t.Fatalf("forgot unknown email must be uniform success, got %v", err)
	}
	if tok := f.pub.lastPayload(internal.StreamMail, internal.EventSend); tok != nil {
		t.Fatal("unknown account must not enqueue any mail")
	}

	if err := f.svc.Forgot(ctx, "erin@example.local"); err != nil {
		t.Fatalf("forgot: %v", err)
	}
	token := resetTokenFromMail(t, f)

	if _, err := f.svc.Login(ctx, "erin@example.local", "password-123", "ua", "ip"); err != nil {
		t.Fatalf("login before reset: %v", err)
	}
	if err := f.svc.Reset(ctx, token, "new-password-456"); err != nil {
		t.Fatalf("reset: %v", err)
	}

	if _, err := f.svc.Login(ctx, "erin@example.local", "password-123", "ua", "ip"); err == nil {
		t.Fatal("old password must stop working after reset")
	}
	if _, err := f.svc.Login(ctx, "erin@example.local", "new-password-456", "ua", "ip"); err != nil {
		t.Fatalf("new password must work: %v", err)
	}
	if err := f.svc.Reset(ctx, token, "again-password-789"); err == nil {
		t.Fatal("replayed reset token must fail (single-use)")
	}
}
