package internal

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

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

func NewService(db *gorm.DB, rdb *redis.Client, log *slog.Logger, pub platform.StreamPublisher) *Service {
	return &Service{db: db, rdb: rdb, log: log.With("component", "service"), pub: pub}
}

// attachPresence stamps online/activeSessions per profile by counting live
// sessions in auth.sessions (read-only cross-schema access, no FK).
func (s *Service) attachPresence(ctx context.Context, profiles []Profile) {
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
	s.attachPresence(ctx, []Profile{p})
	return &p, nil
}

func (s *Service) List(ctx context.Context, limit, offset int, sort, order string) ([]Profile, int64, error) {
	var (
		items []Profile
		total int64
	)
	db := s.db.WithContext(ctx).Model(&Profile{})
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if err := db.Order(userOrderClause(sort, order)).Limit(limit).Offset(offset).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	s.attachPresence(ctx, items)
	return items, total, nil
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
