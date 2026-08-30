package internal

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"sync"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/testutil"
)

type qaPublisher struct {
	mu            sync.Mutex
	events        []platform.AuditEvent
	invalidations []int64
}

func (p *qaPublisher) Publish(_ context.Context, stream, event string, payload any) error {
	if stream != platform.StreamAudit || event != "audit.entry" {
		return nil
	}
	raw, _ := json.Marshal(payload)
	var audit platform.AuditEvent
	_ = json.Unmarshal(raw, &audit)
	p.mu.Lock()
	p.events = append(p.events, audit)
	p.mu.Unlock()
	return nil
}

func (p *qaPublisher) InvalidateClaims(_ context.Context, userID, _ int64) error {
	p.mu.Lock()
	p.invalidations = append(p.invalidations, userID)
	p.mu.Unlock()
	return nil
}

type qaLogger struct{ *slog.Logger }

func roleBuilder(name string, permissions ...string) RoleInput {
	return RoleInput{Name: name, Description: "QA fixture", Permissions: permissions}
}

func newRBACFixture(t *testing.T) (*Service, *gorm.DB, *qaPublisher) {
	t.Helper()
	dsn := testutil.StartPostgres(t)
	if err := MigrateUp(dsn); err != nil {
		t.Fatal(err)
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	pub := &qaPublisher{}
	log := qaLogger{slog.New(slog.NewTextHandler(io.Discard, nil))}
	return NewService(db, log, pub), db, pub
}

func TestPermissionAndRoleAssignmentIntegration(t *testing.T) {
	svc, db, pub := newRBACFixture(t)
	ctx := context.Background()

	if err := svc.CreatePermission(ctx, "report:export:any"); err != nil {
		t.Fatalf("create permission: %v", err)
	}
	if err := svc.CreatePermission(ctx, "invalid"); err == nil {
		t.Fatal("invalid permission format accepted")
	}
	if err := svc.CreatePermission(ctx, "report:export:any"); err == nil {
		t.Fatal("duplicate permission accepted")
	}
	role, err := svc.CreateRole(ctx, roleBuilder("auditor", "report:export:any"))
	if err != nil {
		t.Fatalf("create role: %v", err)
	}
	if err := svc.SetUserRoles(ctx, 42, []int64{role.ID, 999999}); err == nil {
		t.Fatal("unknown role accepted")
	}
	if err := svc.SetUserRoles(ctx, 42, []int64{role.ID}); err != nil {
		t.Fatalf("assign role: %v", err)
	}
	if err := svc.SetUserRoles(ctx, 42, []int64{role.ID}); err != nil {
		t.Fatalf("replace role set: %v", err)
	}

	var version int64
	if err := db.Table("rbac.user_versions").Select("ver").Where("user_id = ?", 42).Scan(&version).Error; err != nil {
		t.Fatal(err)
	}
	if version != 2 {
		t.Fatalf("claim version = %d, want 2", version)
	}
	pub.mu.Lock()
	if len(pub.invalidations) != 2 {
		t.Fatalf("claim invalidations = %d, want 2", len(pub.invalidations))
	}
	if len(pub.events) < 2 || pub.events[0].Action != "create" {
		t.Fatalf("mutation audit events missing: %#v", pub.events)
	}
	pub.mu.Unlock()

	roles := make([]int64, 2)
	for i, name := range []string{"support", "reviewer"} {
		role, err := svc.CreateRole(ctx, roleBuilder(name))
		if err != nil {
			t.Fatal(err)
		}
		roles[i] = role.ID
	}

	start := make(chan struct{})
	errs := make(chan error, 2)
	for _, roleID := range roles {
		go func(id int64) {
			<-start
			errs <- svc.SetUserRoles(ctx, 77, []int64{id})
		}(roleID)
	}
	close(start)
	for range roles {
		if err := <-errs; err != nil {
			t.Fatalf("concurrent assignment: %v", err)
		}
	}

	var versions []int64
	if err := db.Table("rbac.user_roles").Where("user_id = ?", 77).Pluck("ver", &versions).Error; err != nil {
		t.Fatal(err)
	}
	if len(versions) != 1 || versions[0] != 2 {
		t.Fatalf("final assignment versions = %#v, want [2]", versions)
	}
}

func TestAssignDefaultRoleIsIdempotent(t *testing.T) {
	_, db, _ := newRBACFixture(t)
	event := platform.UserCreatedEvent{Sub: "42", Email: "new@example.local", DisplayName: "New User"}
	for range 2 {
		if err := AssignDefaultRole(context.Background(), db, event); err != nil {
			t.Fatal(err)
		}
	}
	var count int64
	if err := db.Table("rbac.user_roles ur").Joins("JOIN rbac.roles r ON r.id = ur.role_id").
		Where("ur.user_id = ? AND r.name = ?", 42, "user").Count(&count).Error; err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("default role assignments = %d, want 1", count)
	}
}

func TestSeedCatalogIsVersionedAndIdempotent(t *testing.T) {
	svc, db, _ := newRBACFixture(t)
	ctx := context.Background()
	if err := svc.Seed(ctx); err != nil {
		t.Fatal(err)
	}
	if err := svc.Seed(ctx); err != nil {
		t.Fatal(err)
	}
	var versions, adminRoles int64
	if err := db.Table("rbac.seed_history").Count(&versions).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Table("rbac.roles").Where("name = ?", "admin").Count(&adminRoles).Error; err != nil {
		t.Fatal(err)
	}
	if versions != 1 || adminRoles != 1 {
		t.Fatalf("seed versions=%d admin roles=%d, want 1/1", versions, adminRoles)
	}
}
