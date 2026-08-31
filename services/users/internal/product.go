package internal

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"gorm.io/gorm"
)

const (
	productTokenBytes = 32
	productMaxPayload = 64 << 10
)

var productKinds = map[string]bool{
	"notification": true, "invitation": true, "access_request": true,
	"delegation": true, "api_key": true, "webhook": true,
	"scheduled_report": true, "saved_view": true, "role_template": true,
	"compliance_report": true, "branding": true, "domain": true,
	"billing_usage": true, "broadcast": true, "chat_message": true,
	"onboarding": true, "retention": true, "consumer_quota": true,
	"email_change": true, "account_deletion": true,
}

var adminProductKinds = map[string]bool{
	"invitation": true, "delegation": true, "role_template": true,
	"compliance_report": true, "branding": true, "domain": true,
	"billing_usage": true, "broadcast": true,
	"retention": true, "consumer_quota": true,
}

type ProductRecord struct {
	ID        int64           `json:"id"`
	Kind      string          `json:"kind"`
	OwnerID   int64           `json:"ownerId"`
	SubjectID *int64          `json:"subjectId,omitempty"`
	Name      string          `json:"name"`
	Status    string          `json:"status"`
	Payload   json.RawMessage `json:"payload"`
	ExpiresAt *time.Time      `json:"expiresAt,omitempty"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

type ProductRecordInput struct {
	Kind      string          `json:"kind"`
	SubjectID *int64          `json:"subjectId"`
	Name      string          `json:"name"`
	Status    string          `json:"status"`
	Payload   json.RawMessage `json:"payload"`
	ExpiresAt *time.Time      `json:"expiresAt"`
}

type ProductOverview struct {
	Users             *UserStats `json:"users"`
	Unread            int64      `json:"unreadNotifications"`
	PendingApprovals  int64      `json:"pendingApprovals"`
	ActiveDelegations int64      `json:"activeDelegations"`
	Webhooks          int64      `json:"webhooks"`
	ScheduledReports  int64      `json:"scheduledReports"`
}

type ProductAnalytics struct {
	Activity []map[string]any `json:"activityHeatmap"`
	Roles    []map[string]any `json:"roleUsage"`
	Usage    map[string]int64 `json:"usage"`
	Risk     []map[string]any `json:"loginRisk"`
}

func (s *Service) UseProductSecret(secret string) { s.productSecret = strings.TrimSpace(secret) }

func (s *Service) UseProductPublicURL(publicURL string) {
	s.productPublicURL = strings.TrimRight(strings.TrimSpace(publicURL), "/")
}

func (s *Service) productLink(path, token string) string {
	return s.productPublicURL + path + "?token=" + url.QueryEscape(token)
}

func (s *Service) productDigests(token string) []string {
	digests := make([]string, 0, 2)
	for _, secret := range strings.Split(s.productSecret, ",") {
		if secret = strings.TrimSpace(secret); secret != "" {
			digests = append(digests, platform.KeyedDigest(secret, strings.TrimSpace(token)))
		}
	}
	return digests
}

func validateProductInput(in *ProductRecordInput) error {
	in.Kind = strings.TrimSpace(in.Kind)
	in.Name = strings.TrimSpace(in.Name)
	in.Status = strings.TrimSpace(in.Status)
	if !productKinds[in.Kind] {
		return platform.ErrBadRequest("unsupported product record kind")
	}
	if in.Name == "" || len(in.Name) > 200 {
		return platform.ErrBadRequest("name must contain 1-200 characters")
	}
	if in.Status == "" {
		in.Status = "active"
	}
	if len(in.Status) > 40 {
		return platform.ErrBadRequest("status is too long")
	}
	if len(in.Payload) == 0 {
		in.Payload = json.RawMessage(`{}`)
	}
	if len(in.Payload) > productMaxPayload || !json.Valid(in.Payload) || in.Payload[0] != '{' {
		return platform.ErrBadRequest("payload must be a JSON object no larger than 64 KiB")
	}
	if in.SubjectID != nil && *in.SubjectID < 1 {
		return platform.ErrBadRequest("subjectId must be a positive integer")
	}
	return nil
}

func (s *Service) productToken(prefix string) (plain, digest string, err error) {
	if s.productSecret == "" {
		return "", "", fmt.Errorf("product token secret is not configured")
	}
	raw := make([]byte, productTokenBytes)
	if _, err = rand.Read(raw); err != nil {
		return "", "", err
	}
	plain = prefix + base64.RawURLEncoding.EncodeToString(raw)
	digest = platform.KeyedDigest(platform.ActiveSecret(s.productSecret), plain)
	return plain, digest, nil
}

func (s *Service) CreateProductRecord(ctx context.Context, ownerID int64, in ProductRecordInput) (*ProductRecord, string, error) {
	if ownerID < 1 {
		return nil, "", platform.ErrUnauthorized("authentication required")
	}
	if err := validateProductInput(&in); err != nil {
		return nil, "", err
	}
	digest, token := "", ""
	if in.Kind == "api_key" || in.Kind == "invitation" || in.Kind == "email_change" || in.Kind == "account_deletion" {
		prefix := ""
		if in.Kind == "api_key" {
			prefix = "pk_"
		}
		var err error
		token, digest, err = s.productToken(prefix)
		if err != nil {
			return nil, "", err
		}
		if in.ExpiresAt == nil && in.Kind != "api_key" {
			expires := time.Now().UTC().Add(7 * 24 * time.Hour)
			in.ExpiresAt = &expires
		}
	}
	var record ProductRecord
	statement := `INSERT INTO users.product_records
		(kind, owner_id, subject_id, name, status, payload, secret_digest, expires_at)
		VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?)`
	if in.Kind == "branding" || in.Kind == "domain" || in.Kind == "retention" {
		statement += ` ON CONFLICT (kind) WHERE kind IN ('branding', 'domain', 'retention') DO UPDATE SET
			owner_id = EXCLUDED.owner_id, subject_id = EXCLUDED.subject_id, name = EXCLUDED.name,
			status = EXCLUDED.status, payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at, updated_at = now()`
	}
	statement += ` RETURNING id, kind, owner_id, subject_id, name, status, payload, expires_at, created_at, updated_at`
	result := s.db.WithContext(ctx).Raw(statement,
		in.Kind, ownerID, in.SubjectID, in.Name, in.Status, string(in.Payload), digest, in.ExpiresAt,
	).Scan(&record)
	if result.Error != nil {
		return nil, "", result.Error
	}
	s.auditAs(ctx, strconv.FormatInt(ownerID, 10), "create", "product."+in.Kind, strconv.FormatInt(record.ID, 10))
	return &record, token, nil
}

func (s *Service) ListProductRecords(ctx context.Context, actorID int64, admin bool, kind, status, query string, limit int) ([]ProductRecord, error) {
	if limit < 1 || limit > 100 {
		limit = 50
	}
	db := s.db.WithContext(ctx).Table("users.product_records").
		Select("id, kind, owner_id, subject_id, name, status, payload, expires_at, created_at, updated_at")
	if !admin {
		db = db.Where("owner_id = ? OR subject_id = ?", actorID, actorID)
	}
	if kind = strings.TrimSpace(kind); kind != "" {
		if !productKinds[kind] {
			return nil, platform.ErrBadRequest("unsupported product record kind")
		}
		db = db.Where("kind = ?", kind)
	}
	if status = strings.TrimSpace(status); status != "" {
		db = db.Where("status = ?", status)
	}
	if query = strings.TrimSpace(query); query != "" {
		db = db.Where("name ILIKE ?", "%"+query+"%")
	}
	var records []ProductRecord
	if err := db.Order("created_at DESC, id DESC").Limit(limit).Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func (s *Service) UpdateProductRecord(ctx context.Context, actorID, id int64, admin bool, status string, payload json.RawMessage) (*ProductRecord, error) {
	status = strings.TrimSpace(status)
	if status == "" || len(status) > 40 || len(payload) > productMaxPayload || !json.Valid(payload) || payload[0] != '{' {
		return nil, platform.ErrBadRequest("valid status and JSON object payload are required")
	}
	where := "id = ?"
	args := []any{id}
	if !admin {
		where += " AND (owner_id = ? OR (subject_id = ? AND kind IN ('notification', 'chat_message')))"
		args = append(args, actorID, actorID)
	}
	var record ProductRecord
	result := s.db.WithContext(ctx).Raw(`UPDATE users.product_records SET status = ?, payload = ?::jsonb,
		updated_at = now() WHERE `+where+`
		RETURNING id, kind, owner_id, subject_id, name, status, payload, expires_at, created_at, updated_at`,
		append([]any{status, string(payload)}, args...)...).Scan(&record)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 || record.ID == 0 {
		return nil, platform.ErrNotFound("product record %d not found", id)
	}
	s.auditAs(ctx, strconv.FormatInt(actorID, 10), "update", "product."+record.Kind, strconv.FormatInt(id, 10))
	return &record, nil
}

func (s *Service) DeleteProductRecord(ctx context.Context, actorID, id int64, admin bool) error {
	db := s.db.WithContext(ctx).Where("id = ?", id)
	if !admin {
		db = db.Where("owner_id = ?", actorID)
	}
	result := db.Delete(&productRecordTable{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return platform.ErrNotFound("product record %d not found", id)
	}
	s.auditAs(ctx, strconv.FormatInt(actorID, 10), "delete", "product.record", strconv.FormatInt(id, 10))
	return nil
}

type productRecordTable struct{ ID int64 }

func (productRecordTable) TableName() string { return "users.product_records" }

func (s *Service) ProductOverview(ctx context.Context, actorID int64) (*ProductOverview, error) {
	stats, err := s.Stats(ctx)
	if err != nil {
		return nil, err
	}
	overview := &ProductOverview{Users: stats}
	queries := []struct {
		dst   *int64
		where string
		args  []any
	}{
		{&overview.Unread, "kind = 'notification' AND subject_id = ? AND status = 'unread'", []any{actorID}},
		{&overview.PendingApprovals, "kind = 'access_request' AND status = 'pending'", nil},
		{&overview.ActiveDelegations, "kind = 'delegation' AND status = 'active' AND (expires_at IS NULL OR expires_at > now())", nil},
		{&overview.Webhooks, "kind = 'webhook' AND status = 'active'", nil},
		{&overview.ScheduledReports, "kind = 'scheduled_report' AND status = 'active'", nil},
	}
	for _, item := range queries {
		if err := s.db.WithContext(ctx).Table("users.product_records").Where(item.where, item.args...).Count(item.dst).Error; err != nil {
			return nil, err
		}
	}
	return overview, nil
}

func (s *Service) ProductAnalytics(ctx context.Context) (*ProductAnalytics, error) {
	result := &ProductAnalytics{Activity: []map[string]any{}, Roles: []map[string]any{}, Risk: []map[string]any{}, Usage: map[string]int64{}}
	if err := s.db.WithContext(ctx).Raw(`SELECT extract(dow FROM created_at)::int AS day,
		extract(hour FROM created_at)::int AS hour, count(*)::bigint AS count
		FROM audit.audit_logs WHERE created_at >= now() - interval '30 days'
		GROUP BY 1, 2 ORDER BY 1, 2`).Scan(&result.Activity).Error; err != nil {
		return nil, err
	}
	if err := s.db.WithContext(ctx).Raw(`SELECT r.id, r.name, count(ur.user_id)::bigint AS users
		FROM rbac.roles r LEFT JOIN rbac.user_roles ur ON ur.role_id = r.id
		GROUP BY r.id, r.name ORDER BY users DESC, r.name`).Scan(&result.Roles).Error; err != nil {
		return nil, err
	}
	for name, table := range map[string]string{"users": "users.users", "sessions": "auth.sessions", "auditEvents": "audit.audit_logs", "productRecords": "users.product_records"} {
		var count int64
		if err := s.db.WithContext(ctx).Table(table).Count(&count).Error; err != nil {
			return nil, err
		}
		result.Usage[name] = count
	}
	if err := s.db.WithContext(ctx).Raw(`SELECT risk_score, anomalous, count(*)::bigint AS count
		FROM auth.login_events WHERE created_at >= now() - interval '30 days'
		GROUP BY risk_score, anomalous ORDER BY risk_score`).Scan(&result.Risk).Error; err != nil {
		return nil, err
	}
	return result, nil
}

func (s *Service) SimulatePermission(ctx context.Context, userID int64, permission string) (bool, []string, error) {
	permission = strings.TrimSpace(permission)
	if userID < 1 || permission == "" || len(permission) > 120 {
		return false, nil, platform.ErrBadRequest("positive userId and permission are required")
	}
	var sources []string
	if err := s.db.WithContext(ctx).Raw(`SELECT DISTINCT r.name FROM rbac.user_roles ur
		JOIN rbac.roles r ON r.id = ur.role_id
		JOIN rbac.role_permissions rp ON rp.role_id = r.id
		JOIN rbac.permissions p ON p.id = rp.permission_id
		WHERE ur.user_id = ? AND p.name = ? ORDER BY r.name`, userID, permission).Scan(&sources).Error; err != nil {
		return false, nil, err
	}
	var delegated int64
	if err := s.db.WithContext(ctx).Table("users.product_records").Where(
		"kind = 'delegation' AND subject_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > now()) AND payload->>'permission' = ?",
		userID, permission).Count(&delegated).Error; err != nil {
		return false, nil, err
	}
	if delegated > 0 {
		sources = append(sources, "temporary delegation")
	}
	return len(sources) > 0, sources, nil
}

func (s *Service) SearchProduct(ctx context.Context, actorID int64, admin bool, query string) ([]map[string]any, error) {
	query = strings.TrimSpace(query)
	if len(query) < 2 || len(query) > 120 {
		return nil, platform.ErrBadRequest("q must contain 2-120 characters")
	}
	results := []map[string]any{}
	if admin {
		var users []struct {
			ID          int64
			Email       string
			DisplayName string
		}
		if err := s.db.WithContext(ctx).Table("users.users").Select("id, email, display_name").
			Where("deleted_at IS NULL AND (email ILIKE ? OR display_name ILIKE ?)", "%"+query+"%", "%"+query+"%").Limit(10).Find(&users).Error; err != nil {
			return nil, err
		}
		for _, user := range users {
			results = append(results, map[string]any{"type": "user", "id": user.ID, "title": user.DisplayName, "subtitle": user.Email})
		}
	}
	records, err := s.ListProductRecords(ctx, actorID, admin, "", "", query, 10)
	if err != nil {
		return nil, err
	}
	for _, record := range records {
		results = append(results, map[string]any{"type": record.Kind, "id": record.ID, "title": record.Name, "subtitle": record.Status})
	}
	return results, nil
}

func (s *Service) ConsumeProductToken(ctx context.Context, kind, token string) (*ProductRecord, error) {
	if s.productSecret == "" || !productKinds[kind] || strings.TrimSpace(token) == "" {
		return nil, platform.ErrBadRequest("invalid or expired token")
	}
	var record ProductRecord
	result := s.db.WithContext(ctx).Raw(`UPDATE users.product_records SET status = 'consumed', updated_at = now()
		WHERE kind = ? AND secret_digest IN ? AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
		RETURNING id, kind, owner_id, subject_id, name, status, payload, expires_at, created_at, updated_at`, kind, s.productDigests(token)).Scan(&record)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 || record.ID == 0 {
		return nil, platform.ErrBadRequest("invalid or expired token")
	}
	return &record, nil
}

func (s *Service) VerifyEmailChange(ctx context.Context, token string) error {
	var ownerID int64
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var record ProductRecord
		result := tx.Raw(`UPDATE users.product_records SET status = 'consumed', updated_at = now()
			WHERE kind = 'email_change' AND secret_digest IN ? AND status = 'active' AND expires_at > now()
			RETURNING owner_id, payload`, s.productDigests(token)).Scan(&record)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 || record.OwnerID == 0 {
			return platform.ErrBadRequest("invalid or expired token")
		}
		var payload struct {
			Email string `json:"email"`
		}
		if json.Unmarshal(record.Payload, &payload) != nil || strings.TrimSpace(payload.Email) == "" {
			return platform.ErrBadRequest("invalid email change request")
		}
		var taken int64
		if err := tx.Table("users.users").Where("lower(email) = ? AND id <> ?", lower2(payload.Email), record.OwnerID).Count(&taken).Error; err != nil {
			return err
		}
		if taken > 0 {
			return platform.ErrConflict("email already in use")
		}
		result = tx.Table("users.users").Where("id = ? AND deleted_at IS NULL", record.OwnerID).Update("email", lower2(payload.Email))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return platform.ErrNotFound("user not found")
		}
		ownerID = record.OwnerID
		return nil
	})
	if err != nil {
		return err
	}
	s.auditAs(ctx, strconv.FormatInt(ownerID, 10), "verify", "profile.email", strconv.FormatInt(ownerID, 10))
	return nil
}

func (s *Service) RestoreDeletion(ctx context.Context, token string) error {
	var ownerID int64
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Raw(`UPDATE users.product_records SET status = 'consumed', updated_at = now()
			WHERE kind = 'account_deletion' AND secret_digest IN ? AND status = 'active' AND expires_at > now()
			RETURNING owner_id`, s.productDigests(token)).Scan(&ownerID)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 || ownerID == 0 {
			return platform.ErrBadRequest("invalid or expired token")
		}
		result = tx.Table("users.users").Where("id = ? AND status = 'deleted' AND deleted_at > now() - interval '30 days'", ownerID).
			Updates(map[string]any{"status": "active", "deleted_at": nil})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return platform.ErrBadRequest("account deletion grace period has expired")
		}
		return nil
	})
	if err != nil {
		return err
	}
	s.auditAs(ctx, strconv.FormatInt(ownerID, 10), "restore", "profile", strconv.FormatInt(ownerID, 10))
	return nil
}

func (s *Service) DispatchProductSchedules(ctx context.Context) error {
	var records []ProductRecord
	if err := s.db.WithContext(ctx).Table("users.product_records").
		Where("kind = 'scheduled_report' AND status = 'active' AND (expires_at IS NULL OR expires_at <= now())").
		Limit(100).Find(&records).Error; err != nil {
		return err
	}
	for _, record := range records {
		var payload struct {
			Email     string `json:"email"`
			Frequency string `json:"frequency"`
			Report    string `json:"report"`
		}
		if json.Unmarshal(record.Payload, &payload) != nil || strings.TrimSpace(payload.Email) == "" {
			continue
		}
		if err := s.pub.Publish(ctx, "mail.jobs", "email.send", map[string]string{
			"to": payload.Email, "subject": "Scheduled platform report: " + record.Name,
			"html": "<p>Your " + html.EscapeString(payload.Report) + " report is ready in Platform Console.</p>",
		}); err != nil {
			return err
		}
		next := time.Now().UTC().Add(24 * time.Hour)
		if payload.Frequency == "weekly" {
			next = time.Now().UTC().Add(7 * 24 * time.Hour)
		}
		if err := s.db.WithContext(ctx).Table("users.product_records").Where("id = ?", record.ID).
			Updates(map[string]any{"expires_at": next, "updated_at": time.Now().UTC()}).Error; err != nil {
			return err
		}
	}
	var compliance []ProductRecord
	if err := s.db.WithContext(ctx).Table("users.product_records").
		Where("kind = 'compliance_report' AND status IN ('active', 'pending')").
		Limit(25).Find(&compliance).Error; err != nil {
		return err
	}
	for _, record := range compliance {
		analytics, err := s.ProductAnalytics(ctx)
		if err != nil {
			return err
		}
		payload, _ := json.Marshal(map[string]any{
			"generatedAt": time.Now().UTC(),
			"evidence":    analytics.Usage,
			"riskSummary": analytics.Risk,
		})
		if err := s.db.WithContext(ctx).Table("users.product_records").Where("id = ?", record.ID).
			Updates(map[string]any{"status": "complete", "payload": payload, "updated_at": time.Now().UTC()}).Error; err != nil {
			return err
		}
	}
	var retention ProductRecord
	if err := s.db.WithContext(ctx).Table("users.product_records").
		Where("kind = 'retention' AND status = 'active'").First(&retention).Error; err == nil {
		var policy struct {
			Days int `json:"days"`
		}
		if json.Unmarshal(retention.Payload, &policy) == nil && policy.Days >= 1 && policy.Days <= 3650 {
			if err := s.db.WithContext(ctx).Exec(`DELETE FROM users.product_records
				WHERE kind NOT IN ('branding', 'domain', 'retention', 'account_deletion')
				AND status NOT IN ('active', 'pending', 'unread') AND created_at < ?`,
				time.Now().UTC().Add(-time.Duration(policy.Days)*24*time.Hour)).Error; err != nil {
				return err
			}
		}
	} else if err != nil && err != gorm.ErrRecordNotFound {
		return err
	}
	return nil
}

func (s *Service) auditAs(ctx context.Context, actor, action, entity, entityID string) {
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{ActorSub: actor, Action: action, Entity: entity, EntityID: entityID})
}

func (s *Service) productMail(ctx context.Context, to, subject, html string) error {
	return s.pub.Publish(ctx, "mail.jobs", "email.send", map[string]string{"to": to, "subject": subject, "html": html})
}

func isProductAdmin(perms []string) bool {
	for _, permission := range perms {
		if permission == "user:read:any" || permission == "role:update:any" {
			return true
		}
	}
	return false
}

func mayCreateProductKind(kind string, perms []string) bool {
	return !adminProductKinds[kind] || isProductAdmin(perms)
}
