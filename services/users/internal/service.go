package internal

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type Service struct {
	db               *gorm.DB
	rdb              *redis.Client
	log              *slog.Logger
	pub              platform.StreamPublisher
	productSecret    string
	productPublicURL string
}

type ListFilters struct {
	Query          string
	Presence       string
	RoleID         int64
	RegisteredFrom *time.Time
	RegisteredTo   *time.Time
	IDs            []int64
	Cursor         *ListCursor
	CountMode      string
}

type ListCursor struct {
	CreatedAt time.Time
	ID        int64
}

type UserStats struct {
	Total         int64             `json:"total"`
	Online        int64             `json:"online"`
	Registrations []RegistrationDay `json:"registrations"`
}

type RegistrationDay struct {
	Day   string `json:"day"`
	Count int64  `json:"count"`
}

func NewService(db *gorm.DB, rdb *redis.Client, log *slog.Logger, pub platform.StreamPublisher) *Service {
	return &Service{db: db, rdb: rdb, log: log.With("component", "service"), pub: pub}
}

// attachPresence stamps online/activeSessions per profile by counting live
// sessions in auth.sessions (read-only cross-schema access, no FK).
func (s *Service) attachManagementData(ctx context.Context, profiles []Profile) {
	if len(profiles) == 0 {
		return
	}
	var aggs []struct {
		UserID int64
		N      int
	}
	if err := s.db.WithContext(ctx).Raw(
		`SELECT user_id, COUNT(*) AS n FROM auth.sessions
		 WHERE revoked_at IS NULL AND expires_at > now() GROUP BY user_id`,
	).Scan(&aggs).Error; err != nil {
		return // presence is best-effort; list stays usable without it
	}
	count := make(map[int64]int, len(aggs))
	for _, a := range aggs {
		count[a.UserID] = a.N
	}
	for i := range profiles {
		profiles[i].ActiveSessions = count[profiles[i].ID]
		profiles[i].Online = count[profiles[i].ID] > 0
	}

	ids := make([]int64, len(profiles))
	for i := range profiles {
		ids[i] = profiles[i].ID
	}
	var assignments []struct {
		UserID int64
		ID     int64
		Name   string
	}
	if err := s.db.WithContext(ctx).Table("rbac.user_roles ur").
		Select("ur.user_id, r.id, r.name").
		Joins("JOIN rbac.roles r ON r.id = ur.role_id").
		Where("ur.user_id IN ?", ids).Order("r.name ASC").Scan(&assignments).Error; err != nil {
		return
	}
	byUser := make(map[int64][]RoleSummary, len(profiles))
	for _, assignment := range assignments {
		byUser[assignment.UserID] = append(byUser[assignment.UserID], RoleSummary{ID: assignment.ID, Name: assignment.Name})
	}
	for i := range profiles {
		profiles[i].Roles = byUser[profiles[i].ID]
		if profiles[i].Roles == nil {
			profiles[i].Roles = []RoleSummary{}
		}
	}

	var grants []struct {
		UserID int64
		Name   string
	}
	if err := s.db.WithContext(ctx).Table("rbac.user_roles ur").
		Distinct("ur.user_id, p.name").
		Joins("JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id").
		Joins("JOIN rbac.permissions p ON p.id = rp.permission_id").
		Where("ur.user_id IN ?", ids).Order("p.name ASC").Scan(&grants).Error; err != nil {
		return
	}
	byUserPermissions := make(map[int64][]string, len(profiles))
	for _, grant := range grants {
		byUserPermissions[grant.UserID] = append(byUserPermissions[grant.UserID], grant.Name)
	}
	for i := range profiles {
		profiles[i].Permissions = byUserPermissions[profiles[i].ID]
		if profiles[i].Permissions == nil {
			profiles[i].Permissions = []string{}
		}
	}
}

func (s *Service) Create(ctx context.Context, in Profile) (*Profile, error) {
	if in.ID <= 0 {
		return nil, platform.ErrBadRequest("id must be a positive integer")
	}
	if err := validateProfileFields(&in.DisplayName, &in.AvatarUrl); err != nil {
		return nil, err
	}
	var count int64
	s.db.WithContext(ctx).Model(&Profile{}).Where("id = ?", in.ID).Count(&count)
	if count > 0 {
		return nil, platform.ErrConflict("profile %d already exists", in.ID)
	}
	if err := s.db.WithContext(ctx).Create(&in).Error; err != nil {
		return nil, err
	}
	s.audit(ctx, "create", "profile", fmt.Sprintf("%d", in.ID))
	return &in, nil
}

func (s *Service) Get(ctx context.Context, id string) (*Profile, error) {
	var p Profile
	if err := s.db.WithContext(ctx).Where("deleted_at IS NULL").First(&p, "id = ?", id).Error; err != nil {
		if gorm.ErrRecordNotFound == err {
			return nil, platform.ErrNotFound("profile %s not found", id)
		}
		return nil, err
	}
	profiles := []Profile{p}
	s.attachManagementData(ctx, profiles)
	return &profiles[0], nil
}

func (s *Service) List(ctx context.Context, limit, offset int, sort, order string, filters ListFilters) ([]Profile, int64, error) {
	var (
		items []Profile
		total int64
	)
	db := s.db.WithContext(ctx).Model(&Profile{}).Where("deleted_at IS NULL")
	if query := strings.TrimSpace(filters.Query); query != "" {
		needle := "%" + strings.ToLower(query) + "%"
		db = db.Where("LOWER(email) LIKE ? OR LOWER(display_name) LIKE ?", needle, needle)
	}
	if filters.Presence == "online" {
		db = db.Where("EXISTS (SELECT 1 FROM auth.sessions s WHERE s.user_id = users.users.id AND s.revoked_at IS NULL AND s.expires_at > now())")
	} else if filters.Presence == "offline" {
		db = db.Where("NOT EXISTS (SELECT 1 FROM auth.sessions s WHERE s.user_id = users.users.id AND s.revoked_at IS NULL AND s.expires_at > now())")
	}
	if filters.RoleID > 0 {
		db = db.Where("EXISTS (SELECT 1 FROM rbac.user_roles ur WHERE ur.user_id = users.users.id AND ur.role_id = ?)", filters.RoleID)
	}
	if filters.RegisteredFrom != nil {
		db = db.Where("created_at >= ?", *filters.RegisteredFrom)
	}
	if filters.RegisteredTo != nil {
		db = db.Where("created_at <= ?", *filters.RegisteredTo)
	}
	if len(filters.IDs) > 0 {
		db = db.Where("id IN ?", filters.IDs)
	}
	if filters.CountMode != "none" {
		if filters.CountMode == "estimate" && filters.Query == "" && filters.Presence == "" && filters.RoleID == 0 && filters.RegisteredFrom == nil && filters.RegisteredTo == nil && len(filters.IDs) == 0 {
			if err := s.db.WithContext(ctx).Raw(`SELECT reltuples::bigint FROM pg_class WHERE oid = 'users.users'::regclass`).Scan(&total).Error; err != nil {
				return nil, 0, err
			}
		} else if err := db.Count(&total).Error; err != nil {
			return nil, 0, err
		}
	} else {
		total = -1
	}
	if filters.Cursor != nil {
		operator := "<"
		if strings.EqualFold(order, "asc") {
			operator = ">"
		}
		db = db.Where("(created_at, id) "+operator+" (?, ?)", filters.Cursor.CreatedAt, filters.Cursor.ID)
	}
	query := db.Order(userOrderClause(sort, order) + ", id " + orderDirection(order)).Limit(limit)
	if filters.Cursor == nil {
		query = query.Offset(offset)
	}
	if err := query.Find(&items).Error; err != nil {
		return nil, 0, err
	}
	s.attachManagementData(ctx, items)
	return items, total, nil
}

func orderDirection(order string) string {
	if strings.EqualFold(order, "asc") {
		return "ASC"
	}
	return "DESC"
}

func (s *Service) Stats(ctx context.Context) (*UserStats, error) {
	stats := &UserStats{Registrations: []RegistrationDay{}}
	if err := s.db.WithContext(ctx).Raw(`SELECT total FROM users.dashboard_stats WHERE id = 1`).Scan(&stats.Total).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Raw(
		`SELECT COUNT(DISTINCT user_id) FROM auth.sessions
		 WHERE revoked_at IS NULL AND expires_at > now()`,
	).Scan(&stats.Online).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Raw(
		`SELECT to_char(days.day, 'YYYY-MM-DD') AS day, COALESCE(r.count, 0) AS count
		 FROM generate_series(
		   date_trunc('day', now()) - interval '6 days',
		   date_trunc('day', now()), interval '1 day'
		 ) AS days(day)
		 LEFT JOIN users.registration_daily r ON r.day = days.day::date
		 ORDER BY days.day`,
	).Scan(&stats.Registrations).Error; err != nil {
		return nil, err
	}
	return stats, nil
}

func userOrderClause(sort, order string) string {
	columns := map[string]string{
		"createdAt":   "created_at",
		"displayName": "display_name",
		"email":       "email",
		"lastLoginAt": "last_login_at",
	}
	column, ok := columns[sort]
	if !ok {
		column = "created_at"
	}
	direction := "DESC"
	if strings.EqualFold(order, "asc") {
		direction = "ASC"
	}
	return column + " " + direction + " NULLS LAST"
}

func (s *Service) Update(ctx context.Context, id string, email, displayName, avatarUrl *string) (*Profile, error) {
	if err := validateProfileFields(displayName, avatarUrl); err != nil {
		return nil, err
	}
	p, err := s.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if email != nil && lower2(*email) != lower2(p.Email) {
		var taken int64
		s.db.WithContext(ctx).Model(&Profile{}).
			Where("lower(email) = ? AND id <> ?", lower2(*email), p.ID).Count(&taken)
		if taken > 0 {
			return nil, platform.ErrConflict("email %s already in use", *email)
		}
		p.Email = lower2(*email)
	}
	if displayName != nil {
		p.DisplayName = *displayName
	}
	if avatarUrl != nil {
		p.AvatarUrl = *avatarUrl
	}
	if err := s.db.WithContext(ctx).Save(p).Error; err != nil {
		return nil, err
	}
	s.audit(ctx, "update", "profile", fmt.Sprintf("%d", p.ID))
	return p, nil
}

func (s *Service) Delete(ctx context.Context, sub string) error {
	var claimsVersion int64
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		res := tx.Exec(
			`UPDATE users.users SET status = 'deleted', deleted_at = now(), display_name = '', avatar_url = ''
			 WHERE id = ? AND deleted_at IS NULL`, sub)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return platform.ErrNotFound("profile %s not found", sub)
		}
		if err := tx.Exec(`UPDATE auth.sessions SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL`, sub).Error; err != nil {
			return err
		}
		return tx.Raw(`INSERT INTO rbac.user_versions (user_id, ver) VALUES (?, 1)
			ON CONFLICT (user_id) DO UPDATE SET ver = rbac.user_versions.ver + 1 RETURNING ver`, sub).Scan(&claimsVersion).Error
	})
	if err != nil {
		return err
	}
	if err := s.rdb.Set(ctx, "claims:ver:"+sub, claimsVersion, 0).Err(); err != nil {
		s.log.Error("invalidate deleted user claims failed", "err", err)
	}
	_ = s.rdb.Publish(ctx, "force-logout", sub).Err()
	s.audit(ctx, "delete", "profile", sub)
	return nil
}

// ScheduleDeletion disables the account and revokes access while retaining
// profile data during the documented restoration window.
func (s *Service) ScheduleDeletion(ctx context.Context, sub string) error {
	var claimsVersion int64
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Exec(`UPDATE users.users SET status = 'deleted', deleted_at = now()
			WHERE id = ? AND deleted_at IS NULL`, sub)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return platform.ErrNotFound("profile %s not found", sub)
		}
		if err := tx.Exec(`UPDATE auth.sessions SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL`, sub).Error; err != nil {
			return err
		}
		return tx.Raw(`INSERT INTO rbac.user_versions (user_id, ver) VALUES (?, 1)
			ON CONFLICT (user_id) DO UPDATE SET ver = rbac.user_versions.ver + 1 RETURNING ver`, sub).Scan(&claimsVersion).Error
	})
	if err != nil {
		return err
	}
	if err := s.rdb.Set(ctx, "claims:ver:"+sub, claimsVersion, 0).Err(); err != nil {
		s.log.Error("invalidate scheduled deletion claims failed", "err", err)
	}
	_ = s.rdb.Publish(ctx, "force-logout", sub).Err()
	s.audit(ctx, "schedule_delete", "profile", sub)
	return nil
}

func (s *Service) ExportData(ctx context.Context, sub string) (map[string]any, error) {
	profile, err := s.Get(ctx, sub)
	if err != nil {
		return nil, err
	}
	var sessions []map[string]any
	if err := s.db.WithContext(ctx).Table("auth.sessions").
		Select("id, device_id, user_agent, ip, created_at, expires_at, revoked_at").
		Where("user_id = ?", sub).Find(&sessions).Error; err != nil {
		return nil, err
	}
	var roles []RoleSummary
	if err := s.db.WithContext(ctx).Table("rbac.user_roles ur").Select("r.id, r.name").
		Joins("JOIN rbac.roles r ON r.id = ur.role_id").Where("ur.user_id = ?", sub).Scan(&roles).Error; err != nil {
		return nil, err
	}
	var audit []map[string]any
	if err := s.db.WithContext(ctx).Table("audit.audit_logs").
		Select("action, entity, entity_id, meta, created_at").Where("actor_sub = ? OR entity_id = ?", sub, sub).
		Order("created_at ASC").Find(&audit).Error; err != nil {
		return nil, err
	}
	return map[string]any{
		"exportedAt": time.Now().UTC(), "profile": profile, "sessions": sessions, "roles": roles, "audit": audit,
	}, nil
}

func (s *Service) EraseSelf(ctx context.Context, sub string) error {
	tx := s.db.WithContext(ctx).Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer tx.Rollback()
	result := tx.Exec(`UPDATE users.users SET email = 'erased+' || id || '@invalid.local', password_hash = 'erased',
		display_name = '', avatar_url = '', mfa_secret_enc = '', mfa_enabled = false,
		status = 'deleted', deleted_at = now() WHERE id = ? AND deleted_at IS NULL`, sub)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return platform.ErrNotFound("profile %s not found", sub)
	}
	for _, statement := range []string{
		"UPDATE auth.sessions SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL",
		"DELETE FROM rbac.user_roles WHERE user_id = ?",
		"UPDATE audit.audit_logs SET actor_sub = 'erased', entity_id = CASE WHEN entity_id = ? THEN 'erased' ELSE entity_id END WHERE actor_sub = ? OR entity_id = ?",
	} {
		args := []any{sub}
		if strings.Contains(statement, "audit_logs") {
			args = []any{sub, sub, sub}
		}
		if err := tx.Exec(statement, args...).Error; err != nil {
			return err
		}
	}
	var claimsVersion int64
	if err := tx.Raw(`INSERT INTO rbac.user_versions (user_id, ver) VALUES (?, 1)
		ON CONFLICT (user_id) DO UPDATE SET ver = rbac.user_versions.ver + 1 RETURNING ver`, sub).Scan(&claimsVersion).Error; err != nil {
		return err
	}
	if err := tx.Commit().Error; err != nil {
		return err
	}
	if err := s.rdb.Set(ctx, "claims:ver:"+sub, claimsVersion, 0).Err(); err != nil {
		s.log.Error("invalidate erased user claims failed", "err", err)
	}
	_ = s.rdb.Publish(ctx, "force-logout", sub).Err()
	if err := s.pub.Publish(ctx, StreamUsers, EventDeleted, platform.UserDeletedEvent{Sub: sub}); err != nil {
		s.log.Error("publish erased user.deleted failed", "err", err)
	}
	s.audit(ctx, "erase", "profile", "erased")
	return nil
}

func (s *Service) audit(ctx context.Context, action, entity, entityID string) {
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{
		ActorSub: "system", Action: action, Entity: entity, EntityID: entityID,
	})
}

func lower2(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func validateProfileFields(displayName, avatarURL *string) error {
	if displayName != nil {
		value := strings.TrimSpace(*displayName)
		if strings.ContainsAny(value, "<>") || strings.IndexFunc(value, func(r rune) bool { return r < 0x20 && r != '\t' }) >= 0 {
			return platform.ErrBadRequest("displayName must be plain text")
		}
		*displayName = value
	}
	if avatarURL != nil {
		value := strings.TrimSpace(*avatarURL)
		if value != "" {
			if err := platform.ValidatePublicHTTPSURL(value); err != nil {
				return platform.ErrBadRequest("avatarUrl must be a public HTTPS URL")
			}
		}
		*avatarURL = value
	}
	return nil
}
