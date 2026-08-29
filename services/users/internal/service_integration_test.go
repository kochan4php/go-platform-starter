package internal

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/testutil"
)

type profileOption func(*Profile)

func profileBuilder(id int64, email string, options ...profileOption) Profile {
	profile := Profile{ID: id, Email: email, PasswordHash: "test-hash", Status: "active"}
	for _, option := range options {
		option(&profile)
	}
	return profile
}

func withDisplayName(name string) profileOption {
	return func(profile *Profile) { profile.DisplayName = name }
}

type userAuditPublisher struct{ events []platform.AuditEvent }

func (p *userAuditPublisher) Publish(_ context.Context, stream, event string, payload any) error {
	if stream == platform.StreamAudit && event == "audit.entry" {
		raw, _ := json.Marshal(payload)
		var audit platform.AuditEvent
		_ = json.Unmarshal(raw, &audit)
		p.events = append(p.events, audit)
	}
	return nil
}

func newUsersFixture(t *testing.T) (*Service, *gorm.DB, *redis.Client, *userAuditPublisher) {
	t.Helper()
	dsn := testutil.StartPostgres(t)
	redisAddr := testutil.StartRedis(t)
	if err := MigrateUp(dsn); err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	ddl := `
		CREATE SCHEMA auth;
		CREATE TABLE auth.sessions (id bigserial primary key, user_id bigint not null, expires_at timestamptz not null, revoked_at timestamptz);
		CREATE SCHEMA rbac;
		CREATE TABLE rbac.roles (id bigserial primary key, name text not null);
		CREATE TABLE rbac.user_roles (user_id bigint not null, role_id bigint not null);
		CREATE TABLE rbac.user_versions (user_id bigint primary key, ver bigint not null default 0);
		CREATE SCHEMA audit;
		CREATE TABLE audit.audit_logs (actor_sub text, action text, entity text, entity_id text, meta jsonb, created_at timestamptz default now());`
	if err := db.Exec(ddl).Error; err != nil {
		t.Fatal(err)
	}
	rdb := redis.NewClient(&redis.Options{Addr: redisAddr})
	t.Cleanup(func() { _ = rdb.Close() })
	pub := &userAuditPublisher{}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewService(db, rdb, log, pub), db, rdb, pub
}

func TestUsersCRUDValidationPresenceAndBoundaries(t *testing.T) {
	svc, db, _, pub := newUsersFixture(t)
	ctx := context.Background()

	first, err := svc.Create(ctx, profileBuilder(1, "one@example.test", withDisplayName(" One ")))
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if first.DisplayName != "One" {
		t.Fatalf("display name was not normalized: %q", first.DisplayName)
	}
	if _, err := svc.Create(ctx, Profile{ID: 0}); err == nil {
		t.Fatal("non-positive id accepted")
	}
	if _, err := svc.Create(ctx, Profile{ID: 2, Email: "x@example.test", PasswordHash: "hash", DisplayName: "<script>"}); err == nil {
		t.Fatal("unsafe display name accepted")
	}
	if _, err := svc.Create(ctx, profileBuilder(2, "two@example.test")); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create(ctx, profileBuilder(3, "three@example.test")); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO auth.sessions (user_id, expires_at) VALUES (1, now() + interval '1 hour')`).Error; err != nil {
		t.Fatal(err)
	}

	got, err := svc.Get(ctx, "1")
	if err != nil || !got.Online || got.ActiveSessions != 1 {
		t.Fatalf("get/presence = %#v, %v", got, err)
	}
	name := "Renamed"
	if _, err := svc.Update(ctx, "1", nil, &name, nil); err != nil {
		t.Fatalf("update: %v", err)
	}
	conflict := "two@example.test"
	if _, err := svc.Update(ctx, "1", &conflict, nil, nil); err == nil {
		t.Fatal("duplicate email accepted")
	}
	items, total, err := svc.List(ctx, 20, 999, "createdAt", "desc", ListFilters{CountMode: "exact"})
	if err != nil || total != 3 || len(items) != 0 {
		t.Fatalf("offset beyond total: items=%d total=%d err=%v", len(items), total, err)
	}
	if err := svc.Delete(ctx, "1"); err != nil {
		t.Fatalf("delete: %v", err)
	}
	var active int64
	if err := db.Table("auth.sessions").Where("user_id = ? AND revoked_at IS NULL", 1).Count(&active).Error; err != nil {
		t.Fatal(err)
	}
	if active != 0 {
		t.Fatalf("active sessions after delete = %d", active)
	}
	actions := map[string]bool{}
	for _, event := range pub.events {
		actions[event.Action] = true
	}
	for _, action := range []string{"create", "update", "delete"} {
		if !actions[action] {
			t.Fatalf("missing %s audit event: %#v", action, pub.events)
		}
	}

	if _, err := svc.Create(ctx, profileBuilder(9, "online@example.test")); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`INSERT INTO auth.sessions (user_id, expires_at) VALUES (9, ?)`, time.Now().Add(time.Hour)).Error; err != nil {
		t.Fatal(err)
	}
	profile, _ := svc.Get(ctx, "9")
	if !profile.Online {
		t.Fatal("active session did not make user online")
	}
	if err := db.Exec(`UPDATE auth.sessions SET revoked_at = now() WHERE user_id = 9`).Error; err != nil {
		t.Fatal(err)
	}
	profile, _ = svc.Get(ctx, "9")
	if profile.Online {
		t.Fatal("revoked session left user online")
	}
}

func TestGoldenUsersFixture(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "users.golden.json"))
	if err != nil {
		t.Fatal(err)
	}
	var profiles []Profile
	if err := json.Unmarshal(raw, &profiles); err != nil {
		t.Fatal(err)
	}
	if len(profiles) != 2 || profiles[0].ID <= 0 || profiles[0].Email == "" || profiles[1].DisplayName == "" {
		t.Fatalf("invalid golden profiles: %#v", profiles)
	}
}
