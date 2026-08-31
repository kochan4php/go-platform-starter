package internal

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

const (
	StreamUsers   = platform.StreamUsers
	EventCreated  = platform.EventUserCreated
	StreamMail    = "mail.jobs"
	EventSend     = "email.send"
	channelLogout = "force-logout"
	dummyHash     = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
)

type Publisher interface {
	Publish(ctx context.Context, stream, event string, payload any) error
}

type RedisPublisher struct {
	RDB *redis.Client
	DB  *gorm.DB
}

func (p RedisPublisher) Publish(ctx context.Context, stream, event string, payload any) error {
	return platform.PublishWithAuditOutbox(ctx, p.DB, p.RDB, stream, event, payload)
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

func (s *Service) secretRing() string { return s.cfg.AccessTokenSecret }

func (s *Service) checkNewPassword(ctx context.Context, email, password string) error {
	if err := validatePasswordComplexity(password, email); err != nil {
		return err
	}
	checkCtx, cancel := context.WithTimeout(ctx, s.cfg.HIBPTimeout)
	defer cancel()
	return checkHIBP(checkCtx, s.cfg.HIBPAPIURL, password)
}

type passwordRecord struct {
	Email           string
	PasswordHash    string
	PasswordHistory pq.StringArray `gorm:"type:text[]"`
}

func (s *Service) replacePassword(ctx context.Context, userID int64, password string) error {
	record, err := s.validatePasswordReplacement(ctx, userID, password)
	if err != nil {
		return err
	}
	return s.storePasswordReplacement(ctx, userID, password, record)
}

func (s *Service) validatePasswordReplacement(ctx context.Context, userID int64, password string) (passwordRecord, error) {
	var record passwordRecord
	if err := s.db.WithContext(ctx).Table("users.users").
		Select("email, password_hash, password_history").Where("id = ?", userID).Scan(&record).Error; err != nil {
		return record, err
	}
	if record.PasswordHash == "" {
		return record, platform.ErrNotFound("user %d not found", userID)
	}
	if err := s.checkNewPassword(ctx, record.Email, password); err != nil {
		return record, err
	}
	if verifyPassword(record.PasswordHash, password) || passwordHistoryContains(record.PasswordHistory, password) {
		return record, platform.ErrBadRequest("new password must not reuse a recent password")
	}
	return record, nil
}

func (s *Service) storePasswordReplacement(ctx context.Context, userID int64, password string, record passwordRecord) error {
	nextHash, err := hashPassword(password, s.cfg.PasswordAlgorithm, s.cfg.BcryptCost)
	if err != nil {
		return err
	}
	history := append(pq.StringArray{record.PasswordHash}, record.PasswordHistory...)
	limit := s.cfg.PasswordHistory
	if limit <= 0 {
		limit = 5
	}
	if len(history) > limit {
		history = history[:limit]
	}
	return s.db.WithContext(ctx).Table("users.users").Where("id = ?", userID).Updates(map[string]any{
		"password_hash": nextHash, "password_history": history,
	}).Error
}

type AuthResult struct {
	AccessToken   string
	User          *User
	RefreshCookie string
	SessionID     int64
	FamilyID      string
	DeviceID      string
}

type TokenIntrospection struct {
	Active bool     `json:"active"`
	Sub    string   `json:"sub,omitempty"`
	Email  string   `json:"email,omitempty"`
	Perms  []string `json:"perms,omitempty"`
	Ver    int64    `json:"ver,omitempty"`
	Exp    int64    `json:"exp,omitempty"`
}

// IntrospectToken validates both the token and the current account/claims
// state. Invalid, deleted, deactivated, or stale tokens are uniformly inactive.
func (s *Service) IntrospectToken(ctx context.Context, raw string) (TokenIntrospection, error) {
	claims, err := ParseTokenWithRing(s.secretRing(), strings.TrimSpace(raw), PurposeAccess)
	if err != nil {
		return TokenIntrospection{}, nil
	}
	var state struct {
		Status string
		Ver    int64
	}
	result := s.db.WithContext(ctx).Raw(`SELECT u.status, COALESCE(v.ver, 0) AS ver
		FROM users.users u LEFT JOIN rbac.user_versions v ON v.user_id = u.id
		WHERE u.id = ? AND u.deleted_at IS NULL`, claims.Sub).Scan(&state)
	if result.Error != nil {
		return TokenIntrospection{}, result.Error
	}
	if result.RowsAffected == 0 || state.Status != string(platform.UserActive) || state.Ver != claims.Ver {
		return TokenIntrospection{}, nil
	}
	response := TokenIntrospection{Active: true, Sub: claims.Sub, Email: claims.Email, Perms: claims.Perms, Ver: claims.Ver}
	if claims.ExpiresAt != nil {
		response.Exp = claims.ExpiresAt.Unix()
	}
	return response, nil
}

func lower(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func (s *Service) Register(ctx context.Context, email, password string, displayName ...string) (*User, error) {
	return s.RegisterWithSub(ctx, uuid.NewString(), email, password, displayName...)
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

	if herr := s.checkNewPassword(ctx, email, password); herr != nil {
		return herr
	}
	hash, herr := hashPassword(password, s.cfg.PasswordAlgorithm, s.cfg.BcryptCost)
	if herr != nil {
		return herr
	}
	var id int64
	if err := s.db.WithContext(ctx).Raw(
		`SELECT id FROM users.users WHERE lower(email) = ?`, lower(email),
	).Scan(&id).Error; err != nil {
		return err
	}
	if id == 0 {
		return platform.ErrNotFound("bootstrap admin %s vanished", email)
	}
	if err := s.db.WithContext(ctx).Exec(
		`UPDATE users.users SET password_hash = ? WHERE id = ?`, hash, id,
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
	if err := s.replacePassword(ctx, userID, newPassword); err != nil {
		return err
	}
	if err := s.db.WithContext(ctx).Exec(
		`DELETE FROM auth.sessions WHERE user_id = ?`, userID,
	).Error; err != nil {
		return err
	}
	s.log.Info("password set by admin", "sub", strconv.FormatInt(userID, 10))
	s.auditAuth(ctx, "password.admin_changed", strconv.FormatInt(userID, 10), nil)
	return nil
}

func (s *Service) RegisterWithSub(ctx context.Context, sub, email, password string, displayName ...string) (*User, error) {
	email = lower(email)
	if err := s.checkNewPassword(ctx, email, password); err != nil {
		return nil, err
	}
	_, lookupErr := findUserByEmail(s.db.WithContext(ctx), email)
	switch {
	case lookupErr == nil:
		return nil, ErrConflictEmail(email)
	case !errors.Is(lookupErr, gorm.ErrRecordNotFound):
		return nil, lookupErr
	}

	hash, err := hashPassword(password, s.cfg.PasswordAlgorithm, s.cfg.BcryptCost)
	if err != nil {
		return nil, err
	}
	id64, perr := strconv.ParseInt(strings.TrimSpace(sub), 10, 64)
	if perr != nil || id64 <= 0 {
		id64 = 0 // public registration: let the identity sequence assign it
	}

	name := ""
	if len(displayName) > 0 {
		name = strings.TrimSpace(displayName[0])
	}
	if utf8.RuneCountInString(name) > 120 || strings.ContainsAny(name, "<>") || strings.IndexFunc(name, func(r rune) bool { return r < 0x20 && r != '\t' }) >= 0 {
		return nil, platform.ErrBadRequest("displayName must be at most 120 plain-text characters")
	}
	u := &User{Email: lower(email), PasswordHash: hash, DisplayName: name}
	if id64 > 0 {
		if err := s.db.WithContext(ctx).Raw(
			`INSERT INTO users.users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?) RETURNING *`,
			id64, u.Email, u.PasswordHash, u.DisplayName,
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
			`INSERT INTO users.users (email, password_hash, display_name) VALUES (?, ?, ?) RETURNING *`,
			u.Email, u.PasswordHash, u.DisplayName,
		).Scan(u).Error; err != nil {
			return nil, err
		}
	}
	if err := s.pub.Publish(ctx, StreamUsers, EventCreated, platform.UserCreatedEvent{
		Sub: strconv.FormatInt(u.ID, 10), Email: u.Email, DisplayName: u.DisplayName,
	}); err != nil {
		s.log.Error("publish user.created failed", "err", err)
	}
	s.log.Info("user registered", "sub", strconv.FormatInt(u.ID, 10))
	s.auditAuth(ctx, "register.succeeded", strconv.FormatInt(u.ID, 10), nil)
	registrationsTotal.Inc()
	return u, nil
}

func (s *Service) Login(ctx context.Context, email, password, userAgent, ip string, device ...string) (result *AuthResult, resultErr error) {
	var historyUser *User
	defer func() {
		outcome := "success"
		if resultErr != nil {
			outcome = "fail"
		}
		loginsTotal.WithLabelValues(outcome).Inc()
		s.recordLoginEvent(ctx, historyUser, ip, userAgent, resultErr)
	}()
	email = lower(email)
	if err := s.checkAccountRate(ctx, email); err != nil {
		return nil, err
	}
	deviceID := ""
	otp := ""
	if len(device) > 0 {
		deviceID = strings.TrimSpace(device[0])
	}
	if len(device) > 1 {
		otp = strings.TrimSpace(device[1])
	}
	u, err := findUserByEmail(s.db.WithContext(ctx), email)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		_ = verifyPassword(dummyHash, password)
		s.auditAuth(ctx, "login.failed", "", map[string]any{"reason": "invalid", "ip": ip})
		return nil, ErrBadCredentials()
	} else if err != nil {
		return nil, err
	}
	historyUser = u

	if u.Status != "active" || (u.LockedUntil != nil && u.LockedUntil.After(s.now())) {
		return nil, ErrBadCredentials()
	}
	if !verifyPassword(u.PasswordHash, password) {
		s.recordFailedAttempt(ctx, u, ip, userAgent)
		s.auditAuth(ctx, "login.failed", strconv.FormatInt(u.ID, 10), map[string]any{"reason": "invalid", "ip": ip})
		return nil, ErrBadCredentials()
	}
	if passwordNeedsRehash(u.PasswordHash, s.cfg.PasswordAlgorithm, s.cfg.BcryptCost) {
		if upgraded, hashErr := hashPassword(password, s.cfg.PasswordAlgorithm, s.cfg.BcryptCost); hashErr == nil {
			_ = s.db.Model(&User{}).Where("id = ?", u.ID).Update("password_hash", upgraded).Error
		}
	}
	if err := s.verifyMFA(ctx, u, otp); err != nil {
		s.recordFailedAttempt(ctx, u, ip, userAgent)
		s.auditAuth(ctx, "mfa.failed", strconv.FormatInt(u.ID, 10), map[string]any{"ip": ip})
		return nil, err
	}

	if err := s.db.Model(&User{}).Where("id = ?", u.ID).
		Updates(map[string]any{"failed_login_attempts": 0, "locked_until": nil}).Error; err != nil {
		return nil, err
	}
	if u.LastLoginAt != nil && u.LastLoginIP != "" && u.LastLoginIP != ip && u.LastLoginUserAgent != "" && u.LastLoginUserAgent != userAgent {
		s.enqueueSecurityMail(ctx, u.Email, "Suspicious sign-in", "A sign-in used a new network and device. If this was not you, change your password immediately.")
		s.auditAuth(ctx, "login.suspicious", strconv.FormatInt(u.ID, 10), map[string]any{"ip": ip, "userAgent": userAgent})
	}
	// Login telemetry for the users dashboard (IP, device, recency).
	if err := s.db.Exec(
		`UPDATE users.users SET last_login_at = now(), last_login_ip = ?, last_login_user_agent = ? WHERE id = ?`,
		ip, userAgent, u.ID,
	).Error; err != nil {
		s.log.Warn("login telemetry update failed", "err", err)
	}
	_ = s.rdb.Del(ctx, s.failKey(email)).Err()

	result, err = s.startSession(ctx, u, userAgent, ip, deviceID)
	if err != nil {
		return nil, err
	}
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{
		ActorSub: strconv.FormatInt(u.ID, 10),
		Action:   "login.succeeded",
		Entity:   "user",
		EntityID: strconv.FormatInt(u.ID, 10),
		Meta:     map[string]any{"ip": ip, "userAgent": userAgent},
	})
	return result, nil
}

func (s *Service) recordFailedAttempt(ctx context.Context, u *User, ip, userAgent string) {
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
		lockoutsTotal.Inc()
		s.enqueueSecurityMail(ctx, u.Email, "Account temporarily locked", "Too many failed sign-in attempts locked your account temporarily. If this was not you, reset your password.")
		s.auditAuth(ctx, "login.locked", strconv.FormatInt(u.ID, 10), map[string]any{"ip": ip, "userAgent": userAgent})
		return
	}
	s.db.Model(&User{}).Where("id = ?", u.ID).UpdateColumn("failed_login_attempts", n)
}

func (s *Service) failKey(email string) string {
	return "login:fail:" + platform.KeyedDigest(platform.ActiveSecret(s.cryptoRing()), lower(email))
}

func (s *Service) checkAccountRate(ctx context.Context, email string) error {
	limit := s.cfg.LoginAccountRate
	if limit <= 0 {
		limit = 10
	}
	key := "login:account:" + platform.KeyedDigest(platform.ActiveSecret(s.cryptoRing()), email)
	n, err := s.rdb.Incr(ctx, key).Result()
	if err != nil {
		return nil
	}
	if n == 1 {
		_ = s.rdb.Expire(ctx, key, time.Minute).Err()
	}
	if n > int64(limit) {
		return &platform.AppError{Status: http.StatusTooManyRequests, Message: "rate_limited", Detail: "too many login attempts for this account"}
	}
	return nil
}

func (s *Service) enqueueSecurityMail(ctx context.Context, to, subject, text string) {
	if err := s.pub.Publish(ctx, StreamMail, EventSend, map[string]string{
		"to": to, "subject": subject, "html": "<p>" + text + "</p>",
	}); err != nil {
		s.log.Warn("security email enqueue failed", "err", err)
	}
}

func (s *Service) auditAuth(ctx context.Context, action, sub string, meta map[string]any) {
	platform.Audit(ctx, s.pub, s.log, platform.AuditEvent{ActorSub: sub, Action: action, Entity: "auth", EntityID: sub, Meta: meta})
}

func (s *Service) cryptoRing() string {
	if strings.TrimSpace(s.cfg.SessionCryptoKeys) != "" {
		return s.cfg.SessionCryptoKeys
	}
	return s.cfg.AccessTokenSecret
}

func (s *Service) tokenDigests(plain string) []string {
	out := []string{}
	for _, key := range strings.Split(s.cryptoRing(), ",") {
		if key = strings.TrimSpace(key); key != "" {
			out = append(out, platform.KeyedDigest(key, plain))
		}
	}
	return out
}

func (s *Service) tokenDigest(plain string) string {
	return platform.KeyedDigest(platform.ActiveSecret(s.cryptoRing()), plain)
}

func (s *Service) startSession(ctx context.Context, u *User, ua, ip, deviceID string) (*AuthResult, error) {
	family := uuid.NewString()
	return s.newSessionInFamily(ctx, u, family, ua, ip, deviceID)
}

// newSessionInFamily creates a session row + access token for the user and
// returns the result carrying the plaintext refresh token (cookie value).
func (s *Service) newSessionInFamily(ctx context.Context, u *User, family, ua, ip, deviceID string) (*AuthResult, error) {
	refresh, err := randomToken(32)
	if err != nil {
		return nil, err
	}
	sess := Session{
		UserID: u.ID, FamilyID: family,
		RefreshTokenHash: s.tokenDigest(refresh), UserAgent: ua, IP: ip, DeviceID: deviceID,
		ExpiresAt: s.now().AddDate(0, 0, s.cfg.RefreshTTLDays),
	}
	if err := s.db.WithContext(ctx).Create(&sess).Error; err != nil {
		return nil, err
	}
	maxSessions := s.cfg.MaxActiveSessions
	if maxSessions <= 0 {
		maxSessions = 10
	}
	if err := s.db.WithContext(ctx).Exec(`UPDATE auth.sessions SET revoked_at = ?
		WHERE user_id = ? AND revoked_at IS NULL AND id NOT IN (
			SELECT id FROM auth.sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC, id DESC LIMIT ?
		)`, s.now(), u.ID, u.ID, maxSessions).Error; err != nil {
		return nil, err
	}
	perms, ver := []string{"user:update:own"}, int64(0)
	if s.claims != nil {
		perms, ver = s.claims.Resolve(ctx, strconv.FormatInt(u.ID, 10))
	}
	access, err := MintAccessWithRing(s.secretRing(), strconv.FormatInt(u.ID, 10), u.Email, ver, perms, time.Duration(s.cfg.AccessTTLMinutes)*time.Minute)
	if err != nil {
		return nil, err
	}
	return &AuthResult{AccessToken: access, User: u, RefreshCookie: refresh, SessionID: sess.ID, FamilyID: family, DeviceID: deviceID}, nil
}

func (s *Service) Refresh(ctx context.Context, refreshPlain string, device ...string) (*AuthResult, error) {
	deviceID := ""
	if len(device) > 0 {
		deviceID = strings.TrimSpace(device[0])
	}
	graceKey := "refresh:grace:" + s.tokenDigest(refreshPlain)
	readGrace := func() (*AuthResult, bool) {
		cached, err := s.rdb.Get(ctx, graceKey).Result()
		if err != nil {
			return nil, false
		}
		var result AuthResult
		plain, decryptErr := platform.DecryptForSubject(s.cryptoRing(), "refresh-grace", graceKey, cached)
		if decryptErr == nil && json.Unmarshal([]byte(plain), &result) == nil && (result.DeviceID == "" || result.DeviceID == deviceID) {
			return &result, true
		}
		return nil, false
	}
	if result, ok := readGrace(); ok {
		return result, nil
	}

	lockKey := "refresh:lock:" + s.tokenDigest(refreshPlain)
	lockID := uuid.NewString()
	for {
		locked, err := s.rdb.SetNX(ctx, lockKey, lockID, 20*time.Second).Result()
		if err != nil {
			return nil, err
		}
		if locked {
			break
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(10 * time.Millisecond):
		}
	}
	defer func() {
		const release = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`
		if err := s.rdb.Eval(context.WithoutCancel(ctx), release, []string{lockKey}, lockID).Err(); err != nil {
			s.log.Warn("refresh lock release failed", "err", err)
		}
	}()
	if result, ok := readGrace(); ok {
		return result, nil
	}
	var sess Session
	err := s.db.Where("refresh_token_hash IN ?", s.tokenDigests(refreshPlain)).First(&sess).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return nil, ErrBadCredentials()
	case err != nil:
		return nil, err
	}

	if sess.RevokedAt != nil {
		s.killFamily(ctx, sess.FamilyID)
		s.auditAuth(ctx, "refresh.reuse", strconv.FormatInt(sess.UserID, 10), map[string]any{"family": sess.FamilyID})
		s.log.Warn("refresh reuse detected — family killed", "family", sess.FamilyID)
		return nil, ErrBadCredentials()
	}
	if sess.ExpiresAt.Before(s.now()) {
		now := s.now()
		sess.RevokedAt = &now
		s.db.Save(&sess)
		return nil, ErrBadCredentials()
	}
	if sess.DeviceID != "" && (deviceID == "" || subtle.ConstantTimeCompare([]byte(sess.DeviceID), []byte(deviceID)) != 1) {
		return nil, ErrBadCredentials()
	}

	var u User
	if err := s.db.First(&u, "id = ?", sess.UserID).Error; err != nil {
		return nil, err
	}
	if u.Status != "active" {
		s.killFamily(ctx, sess.FamilyID)
		return nil, ErrBadCredentials()
	}

	now := s.now()
	sess.RevokedAt = &now
	if err := s.db.Save(&sess).Error; err != nil {
		return nil, err
	}
	res, err := s.newSessionInFamily(ctx, &u, sess.FamilyID, sess.UserAgent, sess.IP, sess.DeviceID)
	if err != nil {
		return nil, err
	}
	if raw, marshalErr := json.Marshal(res); marshalErr == nil {
		grace := s.cfg.RefreshGrace
		if grace <= 0 {
			grace = 10 * time.Second
		}
		if encrypted, encryptErr := platform.EncryptForSubject(platform.ActiveSecret(s.cryptoRing()), "refresh-grace", graceKey, string(raw)); encryptErr == nil {
			_ = s.rdb.Set(ctx, graceKey, encrypted, grace).Err()
		}
	}
	s.auditAuth(ctx, "refresh.succeeded", strconv.FormatInt(sess.UserID, 10), map[string]any{"deviceId": sess.DeviceID})
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
	_ = s.rdb.Del(ctx, "refresh:grace:"+s.tokenDigest(refreshPlain)).Err()
	var sess Session
	err := s.db.Where("refresh_token_hash IN ?", s.tokenDigests(refreshPlain)).First(&sess).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	now := s.now()
	sess.RevokedAt = &now
	if err := s.db.Save(&sess).Error; err != nil {
		return err
	}
	s.auditAuth(ctx, "logout.succeeded", strconv.FormatInt(sess.UserID, 10), nil)
	return nil
}

type sessionView struct {
	ID        int64     `json:"id"`
	UserAgent string    `json:"userAgent"`
	IP        string    `json:"ip"`
	DeviceID  string    `json:"deviceId"`
	CreatedAt time.Time `json:"createdAt"`
	Current   bool      `json:"current"`
}

func (s *Service) ListSessions(ctx context.Context, sub int64, currentToken string) ([]sessionView, error) {
	var rows []Session
	err := s.db.Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", sub, s.now()).
		Order("created_at DESC").Find(&rows).Error
	if err != nil {
		return nil, err
	}
	out := make([]sessionView, 0, len(rows))
	currentDigests := s.tokenDigests(currentToken)
	for _, r := range rows {
		current := false
		for _, digest := range currentDigests {
			current = current || subtle.ConstantTimeCompare([]byte(r.RefreshTokenHash), []byte(digest)) == 1
		}
		out = append(out, sessionView{
			ID: r.ID, UserAgent: r.UserAgent, IP: r.IP, DeviceID: r.DeviceID, CreatedAt: r.CreatedAt,
			Current: currentToken != "" && current,
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

func (s *Service) RevokeAllOtherSessions(ctx context.Context, sub int64, currentToken string) (int64, error) {
	query := s.db.Model(&Session{}).Where("user_id = ? AND revoked_at IS NULL", sub)
	if currentToken != "" {
		query = query.Where("refresh_token_hash NOT IN ?", s.tokenDigests(currentToken))
	}
	res := query.Update("revoked_at", s.now())
	return res.RowsAffected, res.Error
}

func (s *Service) ConfirmPassword(ctx context.Context, sub int64, password string) error {
	var user User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", sub).Error; err != nil {
		return ErrBadCredentials()
	}
	if !verifyPassword(user.PasswordHash, password) {
		return ErrBadCredentials()
	}
	return nil
}

func (s *Service) ChangePassword(ctx context.Context, sub int64, oldPassword, newPassword string) error {
	if err := s.ConfirmPassword(ctx, sub, oldPassword); err != nil {
		return err
	}
	if err := s.replacePassword(ctx, sub, newPassword); err != nil {
		return err
	}
	if _, err := s.RevokeAllOtherSessions(ctx, sub, ""); err != nil {
		return err
	}
	_ = s.rdb.Publish(ctx, channelLogout, sub).Err()
	s.auditAuth(ctx, "password.changed", strconv.FormatInt(sub, 10), nil)
	return nil
}

func (s *Service) SetUserState(ctx context.Context, sub int64, status *string, locked *bool) error {
	updates := map[string]any{}
	if status != nil {
		var current string
		if err := s.db.WithContext(ctx).Table("users.users").Select("status").Where("id = ?", sub).Scan(&current).Error; err != nil {
			return err
		}
		if current == "" {
			return platform.ErrNotFound("user %d not found", sub)
		}
		if err := platform.ValidateUserTransition(platform.UserStatus(current), platform.UserStatus(*status)); err != nil {
			return err
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
	token, err := MintResetWithRing(s.secretRing(), strconv.FormatInt(u.ID, 10), jti, time.Duration(s.cfg.ResetTTLMinutes)*time.Minute)
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
	s.auditAuth(ctx, "password.reset_requested", strconv.FormatInt(u.ID, 10), nil)
	return nil
}

func resetJTIKey(jti string) string { return "reset:jti:" + jti }

// ValidateReset verifies a reset grant without consuming it. The actual reset
// still performs an atomic GETDEL, preserving single-use semantics under races.
func (s *Service) ValidateReset(ctx context.Context, rawToken string) error {
	claims, err := ParseTokenWithRing(s.secretRing(), rawToken, PurposeReset)
	if err != nil {
		return platform.ErrBadRequest("invalid or expired reset token")
	}
	storedSub, err := s.rdb.Get(ctx, resetJTIKey(claims.JTI)).Result()
	if errors.Is(err, redis.Nil) || (err == nil && storedSub != claims.Sub) {
		return platform.ErrBadRequest("invalid or expired reset token")
	}
	if err != nil {
		return err
	}
	return nil
}

func (s *Service) Reset(ctx context.Context, rawToken, newPassword string) error {
	claims, err := ParseTokenWithRing(s.secretRing(), rawToken, PurposeReset)
	if err != nil {
		return platform.ErrBadRequest("invalid or expired reset token")
	}

	userID, parseErr := strconv.ParseInt(claims.Sub, 10, 64)
	if parseErr != nil || userID <= 0 {
		return platform.ErrBadRequest("invalid reset subject")
	}
	record, err := s.validatePasswordReplacement(ctx, userID, newPassword)
	if err != nil {
		return err
	}
	storedSub, err := s.rdb.GetDel(ctx, resetJTIKey(claims.JTI)).Result()
	if errors.Is(err, redis.Nil) || (err == nil && storedSub != claims.Sub) {
		return platform.ErrBadRequest("invalid or expired reset token")
	} else if err != nil {
		return err
	}
	if err := s.storePasswordReplacement(ctx, userID, newPassword, record); err != nil {
		return err
	}
	if err := s.db.Model(&Session{}).
		Where("user_id = ? AND revoked_at IS NULL", claims.Sub).
		Update("revoked_at", s.now()).Error; err != nil {
		return err
	}
	s.log.Info("password reset", "sub", claims.Sub)
	s.auditAuth(ctx, "password.reset_completed", claims.Sub, nil)
	return nil
}
