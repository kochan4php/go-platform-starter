package internal

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/platform/permissions"
)

type Role struct {
	ID          int64    `gorm:"primaryKey" json:"id"`
	Name        string   `gorm:"not null;uniqueIndex" json:"name"`
	Description string   `gorm:"not null;default:''"  json:"description"`
	Permissions []string `gorm:"-"                       json:"permissions"`
}

func (Role) TableName() string { return "rbac.roles" }

type permissionRow struct {
	ID   int64
	Name string
}

func (permissionRow) TableName() string { return "rbac.permissions" }

type rolePermission struct {
	RoleID       int64 `gorm:"column:role_id"`
	PermissionID int64 `gorm:"column:permission_id"`
}

func (rolePermission) TableName() string { return "rbac.role_permissions" }

type userRole struct {
	UserID int64 `gorm:"column:user_id"`
	RoleID int64 `gorm:"column:role_id"`
	Ver    int64 `gorm:"column:ver"`
}

func (userRole) TableName() string { return "rbac.user_roles" }

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

// Seed loads the compile-time catalog into rbac.permissions and assigns the
// admin role (holding every permission) to the bootstrap subject.
func (s *Service) Seed(ctx context.Context) error {
	for _, p := range permissions.All() {
		var pr permissionRow
		s.db.WithContext(ctx).Where("name = ?", p).FirstOrCreate(&pr, permissionRow{Name: p})
	}
	admin := Role{Name: "admin", Description: "bootstrap super-role"}
	if err := s.db.WithContext(ctx).Where("name = ?", "admin").FirstOrCreate(&admin).Error; err != nil {
		return err
	}
	var perms []permissionRow
	if err := s.db.WithContext(ctx).Find(&perms).Error; err != nil {
		return err
	}
	for _, pr := range perms {
		s.db.WithContext(ctx).Exec(
			`INSERT INTO rbac.role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
			admin.ID, pr.ID)
	}
	s.db.WithContext(ctx).Exec(
		`INSERT INTO rbac.user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT (user_id) DO NOTHING`,
		platform.BootstrapSub, admin.ID)
	s.log.Info("rbac seeded", "roles", 1, "permissions", len(perms))
	return nil
}

// CreatePermission adds a new permission to the catalog. Names follow the
// compile-time convention <resource>:<action>:<scope>; duplicates are a no-op
// so seeding and manual creation never conflict.
func (s *Service) CreatePermission(ctx context.Context, name string) error {
	if !validPermissionName(name) {
		return platform.ErrBadRequest("permission must look like resource:action:scope (lowercase)")
	}
	res := s.db.WithContext(ctx).Exec(
		`INSERT INTO rbac.permissions (name) VALUES (?) ON CONFLICT (name) DO NOTHING`, name)
	if res.Error != nil {
		return res.Error
	}
	s.audit(ctx, "create", "permission", name)
	return nil
}

var permNameRe = regexp.MustCompile(`^[a-z0-9_]+:[a-z0-9_]+:[a-z0-9_]+$`)

func validPermissionName(name string) bool {
	return permNameRe.MatchString(strings.TrimSpace(name))
}

func (s *Service) ListPermissions(ctx context.Context) ([]string, error) {
	var rows []permissionRow
	if err := s.db.WithContext(ctx).Order("id").Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]string, 0, len(rows))
	for _, r := range rows {
		out = append(out, r.Name)
	}
	return out, nil
}

func (s *Service) CreateRole(ctx context.Context, name, description string) (*Role, error) {
	var exists int64
	s.db.WithContext(ctx).Model(&Role{}).Where("name = ?", name).Count(&exists)
	if exists > 0 {
		return nil, platform.ErrConflict("role %s already exists", name)
	}
	r := Role{Name: name, Description: description}
	if err := s.db.WithContext(ctx).Create(&r).Error; err != nil {
		return nil, err
	}
	s.audit(ctx, "create", "role", fmt.Sprintf("%d", r.ID))
	return &r, nil
}

func (s *Service) ListRoles(ctx context.Context) ([]Role, error) {
	var roles []Role
	if err := s.db.WithContext(ctx).Find(&roles).Error; err != nil {
		return nil, err
	}
	for i := range roles {
		roles[i].Permissions = s.permsForRole(ctx, roles[i].ID)
	}
	return roles, nil
}

func (s *Service) GetRole(ctx context.Context, id int64) (*Role, error) {
	var r Role
	if err := s.db.WithContext(ctx).First(&r, "id = ?", id).Error; err != nil {
		return nil, err
	}
	r.Permissions = s.permsForRole(ctx, r.ID)
	return &r, nil
}

func (s *Service) permsForRole(ctx context.Context, roleID int64) []string {
	rows := s.db.WithContext(ctx).Raw(`
		SELECT p.name FROM rbac.permissions p
		JOIN rbac.role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id = ? ORDER BY p.id`, roleID)
	out := []string{}
	if err := rows.Scan(&out).Error; err != nil {
		return []string{}
	}
	if out == nil {
		out = []string{}
	}
	return out
}

// UpdateRole renames/describes and — when permSet is non-nil — syncs the full
// permission set, bumping ver for every user holding the role.
func (s *Service) UpdateRole(ctx context.Context, id int64, name, description string, permSet *[]string) (*Role, error) {
	var nameTaken int64
	s.db.WithContext(ctx).Model(&Role{}).Where("name = ? AND id <> ?", name, id).Count(&nameTaken)
	if nameTaken > 0 {
		return nil, platform.ErrConflict("role %s already exists", name)
	}
	var r Role
	if err := s.db.WithContext(ctx).First(&r, "id = ?", id).Error; err != nil {
		return nil, platform.ErrNotFound("role %d not found", id)
	}
	if name != "" {
		r.Name = name
	}
	if description != "" {
		r.Description = description
	}
	if err := s.db.Save(&r).Error; err != nil {
		return nil, err
	}

	if permSet != nil {
		for _, p := range *permSet {
			permissions.MustValid(p)
		}
		var ids []permissionRow
		if len(*permSet) > 0 {
			if err := s.db.Where("name IN ?", *permSet).Find(&ids).Error; err != nil {
				return nil, err
			}
			got := map[string]bool{}
			for _, pr := range ids {
				got[pr.Name] = true
			}
			for _, want := range *permSet {
				if !got[want] {
					return nil, platform.ErrBadRequest("unknown permission %q", want)
				}
			}
		}
		if err := s.db.Exec(`DELETE FROM rbac.role_permissions WHERE role_id = ?`, id).Error; err != nil {
			return nil, err
		}
		for _, pr := range ids {
			s.db.WithContext(ctx).Exec(
				`INSERT INTO rbac.role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
				id, pr.ID)
		}
		s.bumpVer(ctx, id)
	}

	r.Permissions = s.permsForRole(ctx, r.ID)
	s.audit(ctx, "update", "role", fmt.Sprintf("%d", r.ID))
	return &r, nil
}

func (s *Service) bumpVer(ctx context.Context, roleID int64) {
	res := s.db.Exec(`UPDATE rbac.user_roles SET ver = ver + 1 WHERE role_id = ?`, roleID)
	if res.Error == nil && res.RowsAffected > 0 {
		s.log.Warn("ver bumped for affected users",
			fmt.Sprintf("role=%d users=%d", roleID, res.RowsAffected))
	}
}

func (s *Service) DeleteRole(ctx context.Context, id int64) error {
	res := s.db.WithContext(ctx).Exec(`DELETE FROM rbac.roles WHERE id = ?`, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return platform.ErrNotFound("role %d not found", id)
	}
	s.audit(ctx, "delete", "role", fmt.Sprintf("%d", id))
	return nil
}

type Claims struct {
	Perms []string `json:"perms"`
	Ver   int64    `json:"ver"`
}

// ResolveClaims returns the effective permission set + max ver of a subject.
// SetUserRoles replaces the role set of a subject and bumps their claims
// ver so already-issued tokens refresh on their next request.
func (s *Service) SetUserRoles(ctx context.Context, userID int64, roleIDs []int64) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if len(roleIDs) > 0 {
			var known int64
			if err := tx.Model(&Role{}).Where("id IN ?", roleIDs).Count(&known).Error; err != nil {
				return err
			}
			if int(known) != len(roleIDs) {
				return platform.ErrBadRequest("unknown role in set")
			}
		}
		var nextVersion int64
		if err := tx.Raw(
			`INSERT INTO rbac.user_versions (user_id, ver) VALUES (?, 1)
			 ON CONFLICT (user_id) DO UPDATE SET ver = rbac.user_versions.ver + 1
			 RETURNING ver`, userID,
		).Scan(&nextVersion).Error; err != nil {
			return err
		}
		if err := tx.Exec(`DELETE FROM rbac.user_roles WHERE user_id = ?`, userID).Error; err != nil {
			return err
		}
		for _, rid := range roleIDs {
			if err := tx.Exec(
				`INSERT INTO rbac.user_roles (user_id, role_id, ver) VALUES (?, ?, ?)
				 ON CONFLICT (user_id, role_id) DO UPDATE SET ver = EXCLUDED.ver`,
				userID, rid, nextVersion,
			).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Service) GetUserRoles(ctx context.Context, userID int64) ([]Role, error) {
	roles := []Role{}
	err := s.db.WithContext(ctx).Table("rbac.roles r").
		Select("r.id, r.name, r.description").
		Joins("JOIN rbac.user_roles ur ON ur.role_id = r.id").
		Where("ur.user_id = ?", userID).Order("r.name ASC").Scan(&roles).Error
	return roles, err
}

func (s *Service) ResolveClaims(ctx context.Context, sub string) (*Claims, error) {
	// sub arrives as the decimal-string JWT subject (users.id).
	subID, perr := strconv.ParseInt(sub, 10, 64)
	if perr != nil || subID <= 0 {
		return &Claims{Perms: []string{}}, nil // unknown subject: no perms
	}
	var urs []userRole
	if err := s.db.WithContext(ctx).Where("user_id = ?", subID).Find(&urs).Error; err != nil {
		return nil, err
	}
	c := Claims{Perms: []string{}, Ver: 0}
	if err := s.db.WithContext(ctx).Table("rbac.user_versions").
		Select("ver").Where("user_id = ?", subID).Scan(&c.Ver).Error; err != nil {
		return nil, err
	}
	seen := map[string]bool{}
	for _, ur := range urs {
		for _, p := range s.permsForRole(ctx, ur.RoleID) {
			if !seen[p] {
				seen[p] = true
				c.Perms = append(c.Perms, p)
			}
		}
	}
	return &c, nil
}

func (s *Service) audit(ctx context.Context, action, entity, entityID string) {
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{
		Action: action, Entity: entity, EntityID: entityID,
	})
}
