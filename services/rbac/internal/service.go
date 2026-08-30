package internal

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/platform/permissions"
)

type Role struct {
	ID          int64     `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null;uniqueIndex" json:"name"`
	Description string    `gorm:"not null;default:''" json:"description"`
	Color       string    `gorm:"not null;default:'#6366f1'" json:"color"`
	Icon        string    `gorm:"not null;default:'shield'" json:"icon"`
	Archived    bool      `gorm:"not null;default:false" json:"archived"`
	CreatedAt   time.Time `json:"createdAt"`
	Permissions []string  `gorm:"-" json:"permissions"`
	UserCount   int64     `gorm:"-" json:"userCount"`
	System      bool      `gorm:"-" json:"system"`
}

func (Role) TableName() string { return "rbac.roles" }

type PermissionInfo struct {
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	RoleCount int64     `json:"roleCount"`
}

type permissionRow struct {
	ID        int64
	Name      string
	CreatedAt time.Time
}

func (permissionRow) TableName() string { return "rbac.permissions" }

type userRole struct {
	UserID int64 `gorm:"column:user_id"`
	RoleID int64 `gorm:"column:role_id"`
	Ver    int64 `gorm:"column:ver"`
}

func (userRole) TableName() string { return "rbac.user_roles" }

type RoleInput struct {
	Name        string
	Description string
	Color       string
	Icon        string
	Archived    bool
	Permissions []string
}

type Service struct {
	db  *gorm.DB
	log Loggerish
	pub Publisher
}

type (
	Loggerish interface {
		Warn(msg string, args ...any)
		Info(msg string, args ...any)
	}
	Publisher interface {
		Publish(ctx context.Context, stream, event string, payload any) error
	}
)

func NewService(db *gorm.DB, log Loggerish, pub Publisher) *Service {
	return &Service{db: db, log: log, pub: pub}
}

func (s *Service) Seed(ctx context.Context) error {
	return platform.RunSeedVersion(ctx, s.db, "rbac", "2026-08-29-permission-catalog-v1", func(tx *gorm.DB) error {
		return s.seedCatalog(ctx, tx)
	})
}

func (s *Service) seedCatalog(ctx context.Context, db *gorm.DB) error {
	for _, p := range permissions.All() {
		var row permissionRow
		if err := db.WithContext(ctx).Where("name = ?", p).FirstOrCreate(&row, permissionRow{Name: p}).Error; err != nil {
			return err
		}
	}
	admin := Role{Name: "admin", Description: "bootstrap super-role", Color: "#dc2626", Icon: "crown"}
	if err := db.WithContext(ctx).Where("name = ?", "admin").FirstOrCreate(&admin).Error; err != nil {
		return err
	}
	standard := Role{Name: "user", Description: "default registered-user role", Color: "#2563eb", Icon: "user"}
	if err := db.WithContext(ctx).Where("name = ?", "user").FirstOrCreate(&standard).Error; err != nil {
		return err
	}
	var permissionRows []permissionRow
	if err := db.WithContext(ctx).Find(&permissionRows).Error; err != nil {
		return err
	}
	for _, row := range permissionRows {
		if err := db.WithContext(ctx).Exec(
			`INSERT INTO rbac.role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
			admin.ID, row.ID).Error; err != nil {
			return err
		}
	}
	if err := db.WithContext(ctx).Exec(
		`INSERT INTO rbac.user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
		platform.BootstrapSub, admin.ID).Error; err != nil {
		return err
	}
	s.log.Info("rbac seeded", "roles", 2, "permissions", len(permissionRows))
	return nil
}

var (
	permNameRe = regexp.MustCompile(`^[a-z0-9_]+:[a-z0-9_]+:[a-z0-9_]+$`)
	roleNameRe = regexp.MustCompile(`^[a-z][a-z0-9_-]{1,59}$`)
	colorRe    = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)
)

func validPermissionName(name string) bool { return permNameRe.MatchString(strings.TrimSpace(name)) }
func validRoleName(name string) bool       { return roleNameRe.MatchString(strings.TrimSpace(name)) }

func (s *Service) CreatePermission(ctx context.Context, name string) error {
	if !validPermissionName(name) {
		return platform.ErrBadRequest("permission must look like resource:action:scope (lowercase)")
	}
	result := s.db.WithContext(ctx).Exec(
		`INSERT INTO rbac.permissions (name) VALUES (?) ON CONFLICT (name) DO NOTHING`, name)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return platform.ErrConflict("permission %s already exists", name)
	}
	s.audit(ctx, "create", "permission", name, map[string]any{"name": name})
	permissionCreatedTotal.Inc()
	return nil
}

func (s *Service) DeletePermission(ctx context.Context, name string) error {
	var used int64
	if err := s.db.WithContext(ctx).Table("rbac.role_permissions rp").
		Joins("JOIN rbac.permissions p ON p.id = rp.permission_id").
		Where("p.name = ?", name).Count(&used).Error; err != nil {
		return err
	}
	if used > 0 {
		return platform.ErrConflict("permission is assigned to %d role(s)", used)
	}
	result := s.db.WithContext(ctx).Where("name = ?", name).Delete(&permissionRow{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return platform.ErrNotFound("permission %s not found", name)
	}
	s.audit(ctx, "delete", "permission", name, map[string]any{"name": name})
	return nil
}

func (s *Service) ListPermissions(ctx context.Context) ([]PermissionInfo, error) {
	items := []PermissionInfo{}
	err := s.db.WithContext(ctx).Table("rbac.permissions p").
		Select("p.name, p.created_at, COUNT(rp.role_id) AS role_count").
		Joins("LEFT JOIN rbac.role_permissions rp ON rp.permission_id = p.id").
		Group("p.id, p.name, p.created_at").Order("p.name ASC").Scan(&items).Error
	return items, err
}

func normalizeRoleInput(input RoleInput) (RoleInput, error) {
	input.Name = strings.ToLower(strings.TrimSpace(input.Name))
	input.Description = strings.TrimSpace(input.Description)
	input.Color = strings.TrimSpace(input.Color)
	input.Icon = strings.ToLower(strings.TrimSpace(input.Icon))
	input.Permissions = uniqueStrings(input.Permissions)
	if !validRoleName(input.Name) {
		return input, platform.ErrBadRequest("name must be 2..60 lowercase letters, numbers, dashes, or underscores")
	}
	if input.Name == "system" || input.Name == "root" || input.Name == "superuser" {
		return input, platform.ErrBadRequest("reserved role name")
	}
	if len(input.Description) > 300 {
		return input, platform.ErrBadRequest("description must be at most 300 characters")
	}
	if input.Color == "" {
		input.Color = "#6366f1"
	}
	if !colorRe.MatchString(input.Color) {
		return input, platform.ErrBadRequest("color must be a six-digit hex color")
	}
	if input.Icon == "" {
		input.Icon = "shield"
	}
	return input, nil
}

func uniqueStrings(items []string) []string {
	out := make([]string, 0, len(items))
	seen := map[string]bool{}
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item != "" && !seen[item] {
			seen[item] = true
			out = append(out, item)
		}
	}
	return out
}

func (s *Service) CreateRole(ctx context.Context, input RoleInput) (*Role, error) {
	normalized, err := normalizeRoleInput(input)
	if err != nil {
		return nil, err
	}
	if normalized.Name == "admin" {
		return nil, platform.ErrConflict("admin is a protected system role")
	}
	var created Role
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var exists int64
		if err := tx.Model(&Role{}).Where("name = ?", normalized.Name).Count(&exists).Error; err != nil {
			return err
		}
		if exists > 0 {
			return platform.ErrConflict("role %s already exists", normalized.Name)
		}
		created = Role{
			Name: normalized.Name, Description: normalized.Description, Color: normalized.Color,
			Icon: normalized.Icon, Archived: normalized.Archived,
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		return syncPermissions(tx, created.ID, normalized.Permissions)
	})
	if err != nil {
		return nil, err
	}
	created.Permissions = normalized.Permissions
	s.audit(ctx, "create", "role", fmt.Sprintf("%d", created.ID), map[string]any{"after": created})
	rolesChangedTotal.Inc()
	return &created, nil
}

func (s *Service) ListRoles(ctx context.Context) ([]Role, error) {
	roles := []Role{}
	if err := s.db.WithContext(ctx).Order("archived ASC, name ASC").Find(&roles).Error; err != nil {
		return nil, err
	}
	type permissionAssignment struct {
		RoleID int64
		Name   string
	}
	assignments := []permissionAssignment{}
	if err := s.db.WithContext(ctx).Raw(`
		SELECT rp.role_id, p.name FROM rbac.role_permissions rp
		JOIN rbac.permissions p ON p.id = rp.permission_id
		ORDER BY rp.role_id, p.name`).Scan(&assignments).Error; err != nil {
		return nil, err
	}
	permissions := make(map[int64][]string, len(roles))
	for _, assignment := range assignments {
		permissions[assignment.RoleID] = append(permissions[assignment.RoleID], assignment.Name)
	}
	type roleCount struct {
		RoleID int64
		Count  int64
	}
	counts := []roleCount{}
	if err := s.db.WithContext(ctx).Raw(`
		SELECT role_id, COUNT(*) AS count FROM rbac.user_roles GROUP BY role_id`).Scan(&counts).Error; err != nil {
		return nil, err
	}
	userCounts := make(map[int64]int64, len(counts))
	for _, count := range counts {
		userCounts[count.RoleID] = count.Count
	}
	for i := range roles {
		roles[i].Permissions = permissions[roles[i].ID]
		roles[i].UserCount = userCounts[roles[i].ID]
		roles[i].System = roles[i].Name == "admin"
	}
	return roles, nil
}

func (s *Service) GetRole(ctx context.Context, id int64) (*Role, error) {
	var role Role
	if err := s.db.WithContext(ctx).First(&role, "id = ?", id).Error; err != nil {
		return nil, err
	}
	role.Permissions = s.permsForRole(ctx, role.ID)
	if err := s.db.WithContext(ctx).Table("rbac.user_roles").Where("role_id = ?", role.ID).Count(&role.UserCount).Error; err != nil {
		return nil, err
	}
	role.System = role.Name == "admin"
	return &role, nil
}

func (s *Service) permsForRole(ctx context.Context, roleID int64) []string {
	out := []string{}
	if err := s.db.WithContext(ctx).Raw(`
		SELECT p.name FROM rbac.permissions p
		JOIN rbac.role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id = ? ORDER BY p.name`, roleID).Scan(&out).Error; err != nil {
		return []string{}
	}
	return out
}

func syncPermissions(tx *gorm.DB, roleID int64, names []string) error {
	rows := []permissionRow{}
	if len(names) > 0 {
		if err := tx.Where("name IN ?", names).Find(&rows).Error; err != nil {
			return err
		}
		if len(rows) != len(names) {
			return platform.ErrBadRequest("unknown permission in set")
		}
	}
	if err := tx.Exec(`DELETE FROM rbac.role_permissions WHERE role_id = ?`, roleID).Error; err != nil {
		return err
	}
	for _, row := range rows {
		if err := tx.Exec(`INSERT INTO rbac.role_permissions (role_id, permission_id) VALUES (?, ?)`, roleID, row.ID).Error; err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) UpdateRole(ctx context.Context, id int64, input RoleInput) (*Role, error) {
	normalized, err := normalizeRoleInput(input)
	if err != nil {
		return nil, err
	}
	before, err := s.GetRole(ctx, id)
	if err != nil {
		return nil, platform.ErrNotFound("role %d not found", id)
	}
	if before.System && normalized.Name != before.Name {
		return nil, platform.ErrBadRequest("the admin system role cannot be renamed")
	}
	if before.System && normalized.Archived {
		return nil, platform.ErrBadRequest("the admin system role cannot be archived")
	}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var taken int64
		if err := tx.Model(&Role{}).Where("name = ? AND id <> ?", normalized.Name, id).Count(&taken).Error; err != nil {
			return err
		}
		if taken > 0 {
			return platform.ErrConflict("role %s already exists", normalized.Name)
		}
		if err := tx.Model(&Role{}).Where("id = ?", id).Updates(map[string]any{
			"name": normalized.Name, "description": normalized.Description, "color": normalized.Color,
			"icon": normalized.Icon, "archived": normalized.Archived,
		}).Error; err != nil {
			return err
		}
		if err := syncPermissions(tx, id, normalized.Permissions); err != nil {
			return err
		}
		return bumpVerTx(tx, id)
	})
	if err != nil {
		return nil, err
	}
	s.invalidateRoleUsers(ctx, id)
	updated := Role{
		ID: id, Name: normalized.Name, Description: normalized.Description, Color: normalized.Color,
		Icon: normalized.Icon, Archived: normalized.Archived, CreatedAt: before.CreatedAt,
		Permissions: normalized.Permissions, UserCount: before.UserCount, System: before.System,
	}
	s.audit(ctx, "update", "role", fmt.Sprintf("%d", id), map[string]any{"before": before, "after": updated})
	rolesChangedTotal.Inc()
	return &updated, nil
}

func bumpVerTx(tx *gorm.DB, roleID int64) error {
	if err := tx.Exec(`
		INSERT INTO rbac.user_versions (user_id, ver)
		SELECT DISTINCT user_id, 1 FROM rbac.user_roles WHERE role_id = ?
		ON CONFLICT (user_id) DO UPDATE SET ver = rbac.user_versions.ver + 1`, roleID).Error; err != nil {
		return err
	}
	return tx.Exec(`
		UPDATE rbac.user_roles ur SET ver = uv.ver
		FROM rbac.user_versions uv
		WHERE ur.user_id = uv.user_id
		AND ur.user_id IN (SELECT user_id FROM rbac.user_roles WHERE role_id = ?)`, roleID).Error
}

func (s *Service) DeleteRole(ctx context.Context, id int64, fallbackID *int64) error {
	role, err := s.GetRole(ctx, id)
	if err != nil {
		return platform.ErrNotFound("role %d not found", id)
	}
	if role.System {
		return platform.ErrBadRequest("the admin system role cannot be deleted")
	}
	affectedUserIDs := []int64{}
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if role.UserCount > 0 {
			if fallbackID == nil || *fallbackID == id {
				return platform.ErrConflict("select a fallback role for %d affected user(s)", role.UserCount)
			}
			var exists int64
			if err := tx.Model(&Role{}).Where("id = ? AND archived = false", *fallbackID).Count(&exists).Error; err != nil {
				return err
			}
			if exists == 0 {
				return platform.ErrBadRequest("fallback role is unknown or archived")
			}
			if err := tx.Table("rbac.user_roles").Where("role_id = ?", id).Pluck("user_id", &affectedUserIDs).Error; err != nil {
				return err
			}
			if err := tx.Exec(`
				INSERT INTO rbac.user_roles (user_id, role_id, ver)
				SELECT user_id, ?, ver FROM rbac.user_roles WHERE role_id = ?
				ON CONFLICT (user_id, role_id) DO NOTHING`, *fallbackID, id).Error; err != nil {
				return err
			}
			if err := bumpVerTx(tx, id); err != nil {
				return err
			}
		}
		result := tx.Delete(&Role{}, id)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return platform.ErrNotFound("role %d not found", id)
		}
		return nil
	})
	if err != nil {
		return err
	}
	for _, userID := range affectedUserIDs {
		var version int64
		if err := s.db.WithContext(ctx).Table("rbac.user_versions").Select("ver").Where("user_id = ?", userID).Scan(&version).Error; err != nil {
			s.log.Warn("load claim version after role delete failed", "user", userID, "err", err)
			continue
		}
		s.invalidateClaims(ctx, userID, version)
	}
	s.audit(ctx, "delete", "role", fmt.Sprintf("%d", id), map[string]any{"before": role, "fallbackRoleId": fallbackID})
	rolesChangedTotal.Inc()
	return nil
}

type Claims struct {
	Perms []string `json:"perms"`
	Ver   int64    `json:"ver"`
}

func (s *Service) SetUserRoles(ctx context.Context, userID int64, roleIDs []int64) error {
	roleIDs = uniqueInt64s(roleIDs)
	var nextVersion int64
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if len(roleIDs) > 0 {
			var known int64
			if err := tx.Model(&Role{}).Where("id IN ? AND archived = false", roleIDs).Count(&known).Error; err != nil {
				return err
			}
			if int(known) != len(roleIDs) {
				return platform.ErrBadRequest("unknown or archived role in set")
			}
		}
		if err := tx.Raw(`INSERT INTO rbac.user_versions (user_id, ver) VALUES (?, 1)
			ON CONFLICT (user_id) DO UPDATE SET ver = rbac.user_versions.ver + 1 RETURNING ver`, userID).Scan(&nextVersion).Error; err != nil {
			return err
		}
		if err := tx.Exec(`DELETE FROM rbac.user_roles WHERE user_id = ?`, userID).Error; err != nil {
			return err
		}
		for _, roleID := range roleIDs {
			if err := tx.Exec(`INSERT INTO rbac.user_roles (user_id, role_id, ver) VALUES (?, ?, ?)`, userID, roleID, nextVersion).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err == nil {
		s.invalidateClaims(ctx, userID, nextVersion)
		rolesChangedTotal.Inc()
	}
	return err
}

func (s *Service) invalidateRoleUsers(ctx context.Context, roleID int64) {
	var versions []struct{ UserID, Ver int64 }
	if err := s.db.WithContext(ctx).Table("rbac.user_versions uv").Select("uv.user_id, uv.ver").
		Where("uv.user_id IN (SELECT user_id FROM rbac.user_roles WHERE role_id = ?)", roleID).Scan(&versions).Error; err != nil {
		s.log.Warn("load affected claim versions failed", "err", err)
		return
	}
	for _, version := range versions {
		s.invalidateClaims(ctx, version.UserID, version.Ver)
	}
}

func (s *Service) invalidateClaims(ctx context.Context, userID, version int64) {
	publisher, ok := s.pub.(interface {
		InvalidateClaims(context.Context, int64, int64) error
	})
	if ok {
		if err := publisher.InvalidateClaims(ctx, userID, version); err != nil {
			s.log.Warn("invalidate claims failed", "user", userID, "err", err)
		}
	}
}

func uniqueInt64s(items []int64) []int64 {
	out := make([]int64, 0, len(items))
	seen := map[int64]bool{}
	for _, item := range items {
		if item > 0 && !seen[item] {
			seen[item] = true
			out = append(out, item)
		}
	}
	return out
}

func (s *Service) GetUserRoles(ctx context.Context, userID int64) ([]Role, error) {
	roles := []Role{}
	err := s.db.WithContext(ctx).Table("rbac.roles r").
		Select("r.id, r.name, r.description, r.color, r.icon, r.archived, r.created_at").
		Joins("JOIN rbac.user_roles ur ON ur.role_id = r.id").
		Where("ur.user_id = ?", userID).Order("r.name ASC").Scan(&roles).Error
	for i := range roles {
		roles[i].Permissions = s.permsForRole(ctx, roles[i].ID)
		roles[i].System = roles[i].Name == "admin"
	}
	return roles, err
}

func (s *Service) ResolveClaims(ctx context.Context, sub string) (*Claims, error) {
	subID, parseErr := strconv.ParseInt(sub, 10, 64)
	if parseErr != nil || subID <= 0 {
		return &Claims{Perms: []string{}}, nil
	}
	var assigned []userRole
	if err := s.db.WithContext(ctx).Table("rbac.user_roles ur").
		Select("ur.user_id, ur.role_id, ur.ver").
		Joins("JOIN rbac.roles r ON r.id = ur.role_id").
		Where("ur.user_id = ? AND r.archived = false", subID).Scan(&assigned).Error; err != nil {
		return nil, err
	}
	claims := Claims{Perms: []string{"user:update:own"}}
	if err := s.db.WithContext(ctx).Table("rbac.user_versions").Select("ver").Where("user_id = ?", subID).Scan(&claims.Ver).Error; err != nil {
		return nil, err
	}
	seen := map[string]bool{"user:update:own": true}
	for _, assignment := range assigned {
		for _, permission := range s.permsForRole(ctx, assignment.RoleID) {
			if !seen[permission] {
				seen[permission] = true
				claims.Perms = append(claims.Perms, permission)
			}
		}
	}
	return &claims, nil
}

func (s *Service) audit(ctx context.Context, action, entity, entityID string, meta map[string]any) {
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{
		Action: action, Entity: entity, EntityID: entityID, Meta: meta,
	})
}
