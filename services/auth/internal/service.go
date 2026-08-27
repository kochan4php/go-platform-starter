package internal

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

const (
	StreamUsers   = "users.events"
	EventCreated  = "user.created"
	StreamMail    = "mail.jobs"
	EventSend     = "email.send"
	channelLogout = "force-logout"
	dummyHash     = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
)

type Publisher interface {
	Publish(ctx context.Context, stream, event string, payload any) error
}

type RedisPublisher struct{ RDB *redis.Client }

func (p RedisPublisher) Publish(ctx context.Context, stream, event string, payload any) error {
	return platform.Publish(ctx, p.RDB, stream, event, payload)
}

func ErrBadCredentials() *platform.AppError {
	return &platform.AppError{Status: http.StatusUnauthorized, Message: "invalid_credentials", Detail: ""}
}

func ErrConflictEmail(email string) *platform.AppError {
	return platform.ErrConflict("email %q is already registered", email)
}

type Service struct {
	db     *gorm.DB
	rdb    *redis.Client
	log    *slog.Logger
	cfg    Config
	pub    Publisher
	now    func() time.Time
	claims *ClaimsClient
}

func NewService(db *gorm.DB, rdb *redis.Client, log *slog.Logger, cfg Config, pub Publisher) *Service {
	return &Service{
		db: db, rdb: rdb,
		log: log.With("component", "service"),
		cfg: cfg, pub: pub, now: time.Now,
	}
}

func (s *Service) UseClaimsClient(c *ClaimsClient) { s.claims = c }

func (s *Service) secret() []byte { return []byte(s.cfg.AccessTokenSecret) }

type AuthResult struct {
	AccessToken   string
	User          *User
	RefreshCookie string
	SessionID     int64
	FamilyID      string
}

func lower(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func (s *Service) Register(ctx context.Context, email, password string) (*User, error) {
	return s.RegisterWithSub(ctx, uuid.NewString(), email, password)
}

// EnsureBootstrapAdmin creates the bootstrap account when missing; when it
// already exists it resets the password to the declared one and revokes its
// sessions, so environment configuration stays authoritative (lab/uat/demo
// reproducibility). Used by the `-seed` command.
func (s *Service) EnsureBootstrapAdmin(ctx context.Context, sub, email, password string) error {
	_, err := s.RegisterWithSub(ctx, sub, email, password)
	if err == nil {
		return nil
	}
	var appErr *platform.AppError
	if !errors.As(err, &appErr) || appErr.Status != http.StatusConflict {
		return err
	}

	hash, herr := bcrypt.GenerateFromPassword([]byte(password), s.cfg.BcryptCost)
	if herr != nil {
		return herr
	}
	var id string
	if err := s.db.WithContext(ctx).Raw(
		`SELECT id FROM users.users WHERE lower(email) = ?`, lower(email),
	).Scan(&id).Error; err != nil {
		return err
	}
	if id == "" {
		return platform.ErrNotFound("bootstrap admin %s vanished", email)
	}
	if err := s.db.WithContext(ctx).Exec(
		`UPDATE users.users SET password_hash = ? WHERE id = ?`, string(hash), id,
	).Error; err != nil {
		return err
	}
	// Credentials changed: every existing session is void.
	if err := s.db.WithContext(ctx).Exec(
		`DELETE FROM auth.sessions WHERE user_id = ?`, id,
	).Error; err != nil {
		return err
	}
	s.log.Info("bootstrap admin password reset from environment", "email", email)
	return nil
}

// SetPasswordByID lets an admin replace a user's password and revoke their
// sessions, forcing re-login with the new credential.
func (s *Service) SetPasswordByID(ctx context.Context, userID int64, newPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), s.cfg.BcryptCost)
	if err != nil {
		return err
	}
	res := s.db.WithContext(ctx).Exec(
		`UPDATE users.users SET password_hash = ? WHERE id = ?`, string(hash), userID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return platform.ErrNotFound("user %d not found", userID)
	}
	if err := s.db.WithContext(ctx).Exec(
		`DELETE FROM auth.sessions WHERE user_id = ?`, userID,
	).Error; err != nil {
		return err
	}
	s.log.Info("password set by admin", "sub", strconv.FormatInt(userID, 10))
	return nil
}

func (s *Service) RegisterWithSub(ctx context.Context, sub, email, password string) (*User, error) {
	email = lower(email)
	_, lookupErr := findUserByEmail(s.db.WithContext(ctx), email)
	switch {
	case lookupErr == nil:
		return nil, ErrConflictEmail(email)
	case !errors.Is(lookupErr, gorm.ErrRecordNotFound):
		return nil, lookupErr
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), s.cfg.BcryptCost)
	if err != nil {
		return nil, err
	}
	id64, perr := strconv.ParseInt(strings.TrimSpace(sub), 10, 64)
	if perr != nil || id64 <= 0 {
		id64 = 0 // public registration: let the identity sequence assign it
	}

	u := &User{Email: lower(email), PasswordHash: string(hash)}
	if id64 > 0 {
		if err := s.db.WithContext(ctx).Raw(
			`INSERT INTO users.users (id, email, password_hash) VALUES (?, ?, ?) RETURNING *`,
			id64, u.Email, u.PasswordHash,
		).Scan(u).Error; err != nil {
			return nil, err
		}
		// Keep the identity sequence ahead of the explicit bootstrap id.
		if err := s.db.WithContext(ctx).Exec(
			`SELECT setval(pg_get_serial_sequence('users.users', 'id'), GREATEST((SELECT MAX(id) FROM users.users), 1))`,
		).Error; err != nil {
			return nil, err
		}
	} else {
		if err := s.db.WithContext(ctx).Raw(
			`INSERT INTO users.users (email, password_hash) VALUES (?, ?) RETURNING *`,
			u.Email, u.PasswordHash,
		).Scan(u).Error; err != nil {
			return nil, err
		}
	}
	if err := s.pub.Publish(ctx, StreamUsers, EventCreated, map[string]string{"sub": strconv.FormatInt(u.ID, 10), "email": u.Email}); err != nil {
		s.log.Error("publish user.created failed", "err", err)
	}
	s.log.Info("user registered", "sub", strconv.FormatInt(u.ID, 10))
	return u, nil
}

func (s *Service) Login(ctx context.Context, email, password, userAgent, ip string) (*AuthResult, error) {
	email = lower(email)
	u, err := findUserByEmail(s.db.WithContext(ctx), email)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		_ = bcrypt.CompareHashAndPassword([]byte(dummyHash), []byte(password))
		return nil, ErrBadCredentials()
	} else if err != nil {
		return nil, err
	}

	if u.Status != "active" || (u.LockedUntil != nil && u.LockedUntil.After(s.now())) {
		return nil, ErrBadCredentials()
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		s.recordFailedAttempt(ctx, u)
		return nil, ErrBadCredentials()
	}

	if err := s.db.Model(&User{}).Where("id = ?", u.ID).
		Updates(map[string]any{"failed_login_attempts": 0, "locked_until": nil}).Error; err != nil {
		return nil, err
	}
	// Login telemetry for the users dashboard (IP, device, recency).
	if err := s.db.Exec(
		`UPDATE users.users SET last_login_at = now(), last_login_ip = ?, last_login_user_agent = ? WHERE id = ?`,
		ip, userAgent, u.ID,
	).Error; err != nil {
		s.log.Warn("login telemetry update failed", "err", err)
	}
	_ = s.rdb.Del(ctx, s.failKey(email)).Err()

	result, err := s.startSession(ctx, u, userAgent, ip)
	if err != nil {
		return nil, err
	}
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{
		ActorSub: strconv.FormatInt(u.ID, 10),
		Action:   "login",
		Entity:   "user",
		EntityID: strconv.FormatInt(u.ID, 10),
		Meta:     map[string]any{"ip": ip, "userAgent": userAgent},
	})
	return result, nil
}

func (s *Service) recordFailedAttempt(ctx context.Context, u *User) {
	key := s.failKey(u.Email)
	n, err := s.rdb.Incr(ctx, key).Result()
	if err != nil {
		s.log.Warn("lockout counter unavailable (fail-open)", "err", err)
		return
	}
	if n == 1 {
		s.rdb.Expire(ctx, key, time.Duration(s.cfg.LoginLockMinutes)*time.Minute)
	}
	if n >= int64(s.cfg.LoginMaxAttempts) {
		lockUntil := s.now().Add(time.Duration(s.cfg.LoginLockMinutes) * time.Minute)
		if err := s.db.Model(&User{}).Where("id = ?", u.ID).Updates(map[string]any{
			"locked_until": lockUntil, "failed_login_attempts": n,
		}).Error; err != nil {
			s.log.Error("mirror lock to db failed", "err", err)
		}
		s.rdb.Del(ctx, key)
		s.log.Warn("account locked", "sub", u.ID)
		return
	}
	s.db.Model(&User{}).Where("id = ?", u.ID).UpdateColumn("failed_login_attempts", n)
}

func (s *Service) failKey(email string) string { return "login:fail:" + lower(email) }

func (s *Service) startSession(ctx context.Context, u *User, ua, ip string) (*AuthResult, error) {
	family := uuid.NewString()
	return s.newSessionInFamily(ctx, u, family, ua, ip)
}

// newSessionInFamily creates a session row + access token for the user and
// returns the result carrying the plaintext refresh token (cookie value).
func (s *Service) newSessionInFamily(ctx context.Context, u *User, family, ua, ip string) (*AuthResult, error) {
	refresh, err := randomToken(32)
	if err != nil {
		return nil, err
	}
	sess := Session{
		UserID: u.ID, FamilyID: family,
		RefreshTokenHash: sha256Hex(refresh), UserAgent: ua, IP: ip,
		ExpiresAt: s.now().AddDate(0, 0, s.cfg.RefreshTTLDays),
	}
	if err := s.db.WithContext(ctx).Create(&sess).Error; err != nil {
		return nil, err
	}
	perms, ver := []string{}, int64(0)
	if s.claims != nil {
		perms, ver = s.claims.Resolve(ctx, strconv.FormatInt(u.ID, 10))
	}
	access, err := MintAccess(s.secret(), strconv.FormatInt(u.ID, 10), u.Email, ver, perms, time.Duration(s.cfg.AccessTTLMinutes)*time.Minute)
	if err != nil {
		return nil, err
	}
	return &AuthResult{AccessToken: access, User: u, RefreshCookie: refresh, SessionID: sess.ID, FamilyID: family}, nil
}

func (s *Service) Refresh(ctx context.Context, refreshPlain string) (*AuthResult, error) {
	hash := sha256Hex(refreshPlain)
	var sess Session
	err := s.db.Where("refresh_token_hash = ?", hash).First(&sess).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return nil, ErrBadCredentials()
	case err != nil:
		return nil, err
	}

	if sess.RevokedAt != nil {
		s.killFamily(ctx, sess.FamilyID)
		s.log.Warn("refresh reuse detected — family killed", "family", sess.FamilyID)
		return nil, ErrBadCredentials()
	}
	if sess.ExpiresAt.Before(s.now()) {
		now := s.now()
		sess.RevokedAt = &now
		s.db.Save(&sess)
		return nil, ErrBadCredentials()
	}

	var u User
	if err := s.db.First(&u, "id = ?", sess.UserID).Error; err != nil {
		return nil, err
	}

	now := s.now()
	sess.RevokedAt = &now
	if err := s.db.Save(&sess).Error; err != nil {
		return nil, err
	}
	res, err := s.newSessionInFamily(ctx, &u, sess.FamilyID, sess.UserAgent, sess.IP)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func (s *Service) killFamily(ctx context.Context, familyID string) {
	if err := s.db.Model(&Session{}).
		Where("family_id = ? AND revoked_at IS NULL", familyID).
		Update("revoked_at", s.now()).Error; err != nil {
		s.log.Error("kill family failed", "err", err)
	}
	var sess Session
	if err := s.db.Where("family_id = ?", familyID).First(&sess).Error; err == nil {
		_ = s.rdb.Publish(ctx, channelLogout, sess.UserID).Err()
	}
}

func (s *Service) Logout(ctx context.Context, refreshPlain string) error {
	if refreshPlain == "" {
		return nil
	}
	var sess Session
	err := s.db.Where("refresh_token_hash = ?", sha256Hex(refreshPlain)).First(&sess).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	now := s.now()
	sess.RevokedAt = &now
	return s.db.Save(&sess).Error
}

type sessionView struct {
	ID        int64     `json:"id"`
	UserAgent string    `json:"userAgent"`
	IP        string    `json:"ip"`
	CreatedAt time.Time `json:"createdAt"`
	Current   bool      `json:"current"`
}

func (s *Service) ListSessions(ctx context.Context, sub int64, currentHash string) ([]sessionView, error) {
	var rows []Session
	err := s.db.Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", sub, s.now()).
		Order("created_at DESC").Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]sessionView, 0, len(rows))
	for _, r := range rows {
		out = append(out, sessionView{
			ID: r.ID, UserAgent: r.UserAgent, IP: r.IP, CreatedAt: r.CreatedAt,
			Current: currentHash != "" && subtle.ConstantTimeCompare([]byte(r.RefreshTokenHash), []byte(currentHash)) == 1,
		})
	}
	return out, nil
}

func (s *Service) RevokeSession(ctx context.Context, sub, sessionID int64) error {
	res := s.db.Model(&Session{}).
		Where("id = ? AND user_id = ? AND revoked_at IS NULL", sessionID, sub).
		Update("revoked_at", s.now())
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return platform.ErrNotFound("session %d not found", sessionID)
	}
	return nil
}

func (s *Service) RevokeAllOtherSessions(ctx context.Context, sub int64, currentHash string) (int64, error) {
	res := s.db.Model(&Session{}).
		Where("user_id = ? AND revoked_at IS NULL AND refresh_token_hash <> ?", sub, currentHash).
		Update("revoked_at", s.now())
	return res.RowsAffected, res.Error
}

func (s *Service) ConfirmPassword(ctx context.Context, sub int64, password string) error {
	var user User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", sub).Error; err != nil {
		return ErrBadCredentials()
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)) != nil {
		return ErrBadCredentials()
	}
	return nil
}

func (s *Service) SetUserState(ctx context.Context, sub int64, status *string, locked *bool) error {
	updates := map[string]any{}
	if status != nil {
		if *status != "active" && *status != "inactive" {
			return platform.ErrBadRequest("status must be active or inactive")
		}
		updates["status"] = *status
	}
	if locked != nil {
		if *locked {
			updates["locked_until"] = s.now().AddDate(100, 0, 0)
		} else {
			updates["locked_until"] = nil
			updates["failed_login_attempts"] = 0
		}
	}
	if len(updates) == 0 {
		return platform.ErrBadRequest("status or locked is required")
	}
	result := s.db.WithContext(ctx).Model(&User{}).Where("id = ?", sub).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return platform.ErrNotFound("user %d not found", sub)
	}
	if (status != nil && *status == "inactive") || (locked != nil && *locked) {
		if _, err := s.RevokeAllOtherSessions(ctx, sub, ""); err != nil {
			return err
		}
		_ = s.rdb.Publish(ctx, channelLogout, sub).Err()
	}
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{
		ActorSub: "system", Action: "state.update", Entity: "user", EntityID: strconv.FormatInt(sub, 10),
	})
	return nil
}

func (s *Service) Forgot(ctx context.Context, email string) error {
	u, err := findUserByEmail(s.db.WithContext(ctx), lower(email))
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil // uniform response — no enumeration
	} else if err != nil {
		return err
	}

	jti := uuid.NewString()
	token, err := MintReset(s.secret(), strconv.FormatInt(u.ID, 10), jti, time.Duration(s.cfg.ResetTTLMinutes)*time.Minute)
	if err != nil {
		return err
	}
	if err := s.rdb.Set(ctx, resetJTIKey(jti), u.ID, time.Duration(s.cfg.ResetTTLMinutes)*time.Minute).Err(); err != nil {
		return err
	}
	link := fmt.Sprintf("%s/reset?token=%s", s.cfg.AppPublicURL, token)
	payload := map[string]string{
		"to":      u.Email,
		"subject": "Reset your password",
		"html":    "<p>Click to reset your password:</p><p><a href=\"" + link + "\">Reset password</a></p>",
	}
	if err := s.pub.Publish(ctx, StreamMail, EventSend, payload); err != nil {
		s.log.Error("enqueue reset mail failed", "err", err)
	}
	s.log.Info("reset requested", "sub", u.ID)
	return nil
}

func resetJTIKey(jti string) string { return "reset:jti:" + jti }

func (s *Service) Reset(ctx context.Context, rawToken, newPassword string) error {
	claims, err := ParseToken(s.secret(), rawToken, PurposeReset)
	if err != nil {
		return platform.ErrBadRequest("invalid or expired reset token")
	}

	storedSub, err := s.rdb.GetDel(ctx, resetJTIKey(claims.JTI)).Result()
	if errors.Is(err, redis.Nil) || (err == nil && storedSub != claims.Sub) {
		return platform.ErrBadRequest("invalid or expired reset token")
	} else if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), s.cfg.BcryptCost)
	if err != nil {
		return err
	}
	if err := s.db.Model(&User{}).Where("id = ?", claims.Sub).Update("password_hash", string(hash)).Error; err != nil {
		return err
	}
	if err := s.db.Model(&Session{}).
		Where("user_id = ? AND revoked_at IS NULL", claims.Sub).
		Update("revoked_at", s.now()).Error; err != nil {
		return err
	}
	s.log.Info("password reset", "sub", claims.Sub)
	return nil
}
