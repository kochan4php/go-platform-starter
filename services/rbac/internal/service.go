package internal

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/platform/permissions"
)

type Role struct {
	ID          string   `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string   `gorm:"not null;uniqueIndex" json:"name"`
	Description string   `gorm:"not null;default:''"  json:"description"`
	Permissions []string `gorm:"-"                    json:"permissions,omitempty"`
}

func (Role) TableName() string { return "rbac.roles" }

type permissionRow struct {
	ID   int64
	Name string
}

func (permissionRow) TableName() string { return "rbac.permissions" }

type rolePermission struct {
	RoleID       string `gorm:"column:role_id"`
	PermissionID int64  `gorm:"column:permission_id"`
}

func (rolePermission) TableName() string { return "rbac.role_permissions" }

type userRole struct {
	UserSub string `gorm:"column:user_sub"`
	RoleID  string `gorm:"column:role_id"`
	Ver     int64  `gorm:"column:ver"`
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
	admin := Role{ID: uuid.NewString(), Name: "admin", Description: "bootstrap super-role"}
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
		`INSERT INTO rbac.user_roles (user_sub, role_id) VALUES (?, ?) ON CONFLICT (user_sub) DO NOTHING`,
		platform.BootstrapSub, admin.ID)
	s.log.Info("rbac seeded", "roles", 1, "permissions", len(perms))
	return nil
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
	r := Role{ID: uuid.NewString(), Name: name, Description: description}
	if err := s.db.WithContext(ctx).Create(&r).Error; err != nil {
		return nil, err
	}
	s.audit(ctx, "create", "role", r.ID)
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

func (s *Service) GetRole(ctx context.Context, id string) (*Role, error) {
	var r Role
	if err := s.db.WithContext(ctx).First(&r, "id = ?", id).Error; err != nil {
		return nil, err
	}
	r.Permissions = s.permsForRole(ctx, r.ID)
	return &r, nil
}

func (s *Service) permsForRole(ctx context.Context, roleID string) []string {
	rows := s.db.WithContext(ctx).Raw(`
		SELECT p.name FROM rbac.permissions p
		JOIN rbac.role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id = ? ORDER BY p.id`, roleID)
	out := []string{}
	if err := rows.Scan(&out).Error; err != nil {
		return []string{}
	}
	return out
}

// UpdateRole renames/describes and — when permSet is non-nil — syncs the full
// permission set, bumping ver for every user holding the role.
func (s *Service) UpdateRole(ctx context.Context, id, name, description string, permSet *[]string) (*Role, error) {
	var r Role
	if err := s.db.WithContext(ctx).First(&r, "id = ?", id).Error; err != nil {
		return nil, platform.ErrNotFound("role %s not found", id)
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
	s.audit(ctx, "update", "role", r.ID)
	return &r, nil
}

func (s *Service) bumpVer(ctx context.Context, roleID string) {
	res := s.db.Exec(`UPDATE rbac.user_roles SET ver = ver + 1 WHERE role_id = ?`, roleID)
	if res.Error == nil && res.RowsAffected > 0 {
		s.log.Warn("ver bumped for affected users",
			fmt.Sprintf("role=%s users=%d", roleID, res.RowsAffected))
	}
}

func (s *Service) DeleteRole(ctx context.Context, id string) error {
	res := s.db.WithContext(ctx).Exec(`DELETE FROM rbac.roles WHERE id = ?`, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return platform.ErrNotFound("role %s not found", id)
	}
	s.audit(ctx, "delete", "role", id)
	return nil
}

type Claims struct {
	Perms []string `json:"perms"`
	Ver   int64    `json:"ver"`
}

// ResolveClaims returns the effective permission set + max ver of a subject.
func (s *Service) ResolveClaims(ctx context.Context, sub string) (*Claims, error) {
	var urs []userRole
	if err := s.db.WithContext(ctx).Where("user_sub = ?", sub).Find(&urs).Error; err != nil {
		return nil, err
	}
	c := Claims{Perms: []string{}, Ver: 0}
	seen := map[string]bool{}
	for _, ur := range urs {
		if ur.Ver > c.Ver {
			c.Ver = ur.Ver
		}
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
