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
	db  *gorm.DB
	rdb *redis.Client
	log *slog.Logger
	pub platform.StreamPublisher
}

type ListFilters struct {
	Query          string
	Presence       string
	RoleID         int64
	RegisteredFrom *time.Time
	RegisteredTo   *time.Time
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
}

func (s *Service) Create(ctx context.Context, in Profile) (*Profile, error) {
	if in.ID <= 0 {
		return nil, platform.ErrBadRequest("id must be a positive integer")
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
	if err := s.db.WithContext(ctx).First(&p, "id = ?", id).Error; err != nil {
		if gorm.ErrRecordNotFound == err {
			return nil, platform.ErrNotFound("profile %s not found", id)
		}
		return nil, err
	}
	s.attachManagementData(ctx, []Profile{p})
	return &p, nil
}

func (s *Service) List(ctx context.Context, limit, offset int, sort, order string, filters ListFilters) ([]Profile, int64, error) {
	var (
		items []Profile
		total int64
	)
	db := s.db.WithContext(ctx).Model(&Profile{})
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
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order(userOrderClause(sort, order)).Limit(limit).Offset(offset).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	s.attachManagementData(ctx, items)
	return items, total, nil
}

func (s *Service) Stats(ctx context.Context) (*UserStats, error) {
	stats := &UserStats{Registrations: []RegistrationDay{}}
	if err := s.db.WithContext(ctx).Model(&Profile{}).Count(&stats.Total).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Raw(
		`SELECT COUNT(DISTINCT user_id) FROM auth.sessions
		 WHERE revoked_at IS NULL AND expires_at > now()`,
	).Scan(&stats.Online).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Raw(
		`SELECT to_char(days.day, 'YYYY-MM-DD') AS day, COUNT(u.id) AS count
		 FROM generate_series(
		   date_trunc('day', now()) - interval '6 days',
		   date_trunc('day', now()), interval '1 day'
		 ) AS days(day)
		 LEFT JOIN users.users u ON u.created_at >= days.day AND u.created_at < days.day + interval '1 day'
		 GROUP BY days.day ORDER BY days.day`,
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
	res := s.db.WithContext(ctx).Exec(`DELETE FROM users.users WHERE id = ?`, sub)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return platform.ErrNotFound("profile %s not found", sub)
	}
	if err := s.pub.Publish(ctx, StreamUsers, EventDeleted, map[string]string{"sub": sub}); err != nil {
		s.log.Error("publish user.deleted failed", "err", err)
	}
	if err := QueueProfilePurge(ctx, s.rdb, sub); err != nil {
		s.log.Error("queue profile purge failed", "err", err)
	}
	s.audit(ctx, "delete", "profile", sub)
	return nil
}

func (s *Service) audit(ctx context.Context, action, entity, entityID string) {
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{
		ActorSub: "system", Action: action, Entity: entity, EntityID: entityID,
	})
}

func lower2(s string) string { return strings.ToLower(strings.TrimSpace(s)) }
