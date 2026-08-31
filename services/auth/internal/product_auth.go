package internal

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"gorm.io/gorm"
)

type LoginEvent struct {
	ID        int64     `json:"id"`
	Success   bool      `json:"success"`
	RiskScore int       `json:"riskScore"`
	Anomalous bool      `json:"anomalous"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"userAgent"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"createdAt"`
}

type oauthConfig struct {
	ClientID, ClientSecret, AuthURL, TokenURL, UserURL, Scope string
}

func (s *Service) loginRisk(ctx context.Context, user *User, ip, userAgent string, failed bool) int {
	score := 0
	if failed {
		score += 25
	}
	if user == nil {
		return min(100, score+35)
	}
	if user.LastLoginIP != "" && user.LastLoginIP != ip {
		score += 35
	}
	if user.LastLoginUserAgent != "" && user.LastLoginUserAgent != userAgent {
		score += 25
	}
	var recentFailures int64
	_ = s.db.WithContext(ctx).Table("auth.login_events").Where(
		"user_id = ? AND success = false AND created_at > now() - interval '1 hour'", user.ID,
	).Count(&recentFailures).Error
	score += min(30, int(recentFailures)*10)
	return min(100, score)
}

func (s *Service) recordLoginEvent(ctx context.Context, user *User, ip, userAgent string, loginErr error) {
	score := s.loginRisk(ctx, user, ip, userAgent, loginErr != nil)
	var userID *int64
	if user != nil {
		userID = &user.ID
	}
	reason := "success"
	if loginErr != nil {
		reason = "failed"
	}
	if err := s.db.WithContext(ctx).Exec(`INSERT INTO auth.login_events
		(user_id, success, risk_score, anomalous, ip, user_agent, reason)
		VALUES (?, ?, ?, ?, ?, ?, ?)`, userID, loginErr == nil, score, score >= 60, ip, userAgent, reason).Error; err != nil {
		s.log.Warn("login history write failed", "err", err)
	}
}

func (s *Service) LoginHistory(ctx context.Context, userID int64, limit int) ([]LoginEvent, error) {
	if limit < 1 || limit > 100 {
		limit = 30
	}
	var events []LoginEvent
	err := s.db.WithContext(ctx).Table("auth.login_events").
		Select("id, success, risk_score, anomalous, ip, user_agent, reason, created_at").
		Where("user_id = ?", userID).Order("created_at DESC, id DESC").Limit(limit).Find(&events).Error
	return events, err
}

func (s *Service) GenerateRecoveryCodes(ctx context.Context, userID int64) ([]string, error) {
	var enabled bool
	if err := s.db.WithContext(ctx).Table("users.users").Select("mfa_enabled").Where("id = ?", userID).Scan(&enabled).Error; err != nil {
		return nil, err
	}
	if !enabled {
		return nil, platform.ErrBadRequest("enable MFA before generating recovery codes")
	}
	codes := make([]string, 10)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM auth.identity_tokens WHERE user_id = ? AND kind = 'recovery_code'", userID).Error; err != nil {
			return err
		}
		for i := range codes {
			raw, err := randomToken(10)
			if err != nil {
				return err
			}
			codes[i] = "rc_" + raw
			if err := tx.Exec(`INSERT INTO auth.identity_tokens (user_id, kind, token_digest, expires_at)
				VALUES (?, 'recovery_code', ?, ?)`, userID, s.tokenDigest(codes[i]), s.now().Add(365*24*time.Hour)).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	s.auditAuth(ctx, "mfa.recovery_codes_rotated", strconv.FormatInt(userID, 10), map[string]any{"count": len(codes)})
	return codes, nil
}

func (s *Service) consumeRecoveryCode(ctx context.Context, userID int64, code string) bool {
	result := s.db.WithContext(ctx).Exec(`UPDATE auth.identity_tokens SET consumed_at = now()
		WHERE id = (SELECT id FROM auth.identity_tokens WHERE user_id = ? AND kind = 'recovery_code'
		AND token_digest IN ? AND consumed_at IS NULL AND expires_at > now() FOR UPDATE SKIP LOCKED LIMIT 1)`,
		userID, s.tokenDigests(strings.TrimSpace(code)))
	return result.Error == nil && result.RowsAffected == 1
}

func (s *Service) RequestMagicLink(ctx context.Context, email string) error {
	user, err := findUserByEmail(s.db.WithContext(ctx), lower(email))
	if err != nil || user.Status != "active" {
		return nil
	}
	token, err := randomToken(32)
	if err != nil {
		return err
	}
	if err := s.db.WithContext(ctx).Exec(`INSERT INTO auth.identity_tokens
		(user_id, kind, token_digest, expires_at) VALUES (?, 'magic_link', ?, ?)`,
		user.ID, s.tokenDigest(token), s.now().Add(15*time.Minute)).Error; err != nil {
		return err
	}
	link := strings.TrimRight(s.cfg.AppPublicURL, "/") + "/magic-login?token=" + url.QueryEscape(token)
	return s.pub.Publish(ctx, StreamMail, EventSend, map[string]string{
		"to": user.Email, "subject": "Your sign-in link", "html": `<p><a href="` + link + `">Sign in</a>. This link expires in 15 minutes.</p>`,
	})
}

func (s *Service) ConsumeMagicLink(ctx context.Context, token, userAgent, ip, deviceID string) (*AuthResult, error) {
	var userID int64
	result := s.db.WithContext(ctx).Raw(`UPDATE auth.identity_tokens SET consumed_at = now()
		WHERE kind = 'magic_link' AND token_digest IN ? AND consumed_at IS NULL AND expires_at > now()
		RETURNING user_id`, s.tokenDigests(strings.TrimSpace(token))).Scan(&userID)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 || userID == 0 {
		return nil, platform.ErrBadRequest("invalid or expired magic link")
	}
	var user User
	if err := s.db.WithContext(ctx).Where("id = ? AND status = 'active'", userID).First(&user).Error; err != nil {
		return nil, ErrBadCredentials()
	}
	auth, err := s.startSession(ctx, &user, userAgent, ip, deviceID)
	if err == nil {
		s.auditAuth(ctx, "magic_link.succeeded", strconv.FormatInt(user.ID, 10), map[string]any{"ip": ip})
		s.recordLoginEvent(ctx, &user, ip, userAgent, nil)
	}
	return auth, err
}

func (s *Service) Impersonate(ctx context.Context, actorID, targetID int64) (string, *User, error) {
	if actorID == targetID {
		return "", nil, platform.ErrBadRequest("cannot impersonate yourself")
	}
	var target User
	if err := s.db.WithContext(ctx).Where("id = ? AND status = 'active'", targetID).First(&target).Error; err != nil {
		return "", nil, platform.ErrNotFound("target user not found")
	}
	perms, ver := []string{}, int64(0)
	if s.claims != nil {
		resolved, resolvedVer := s.claims.Resolve(ctx, strconv.FormatInt(target.ID, 10))
		ver = resolvedVer
		for _, permission := range resolved {
			if strings.Contains(permission, ":read:") || strings.HasSuffix(permission, ":read") {
				perms = append(perms, permission)
			}
		}
	}
	token, err := MintImpersonationWithRing(s.secretRing(), strconv.FormatInt(target.ID, 10), target.Email,
		strconv.FormatInt(actorID, 10), ver, perms, 15*time.Minute)
	if err != nil {
		return "", nil, err
	}
	s.auditAuth(ctx, "impersonation.started", strconv.FormatInt(actorID, 10), map[string]any{"target": targetID, "readOnly": true})
	return token, &target, nil
}

func (s *Service) oauthProvider(provider string) (oauthConfig, error) {
	switch provider {
	case "google":
		if s.cfg.GoogleClientID == "" || s.cfg.GoogleClientSecret == "" {
			return oauthConfig{}, unavailable("google login is not configured")
		}
		return oauthConfig{s.cfg.GoogleClientID, s.cfg.GoogleClientSecret,
			"https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token",
			"https://openidconnect.googleapis.com/v1/userinfo", "openid email profile"}, nil
	case "github":
		if s.cfg.GitHubClientID == "" || s.cfg.GitHubClientSecret == "" {
			return oauthConfig{}, unavailable("github login is not configured")
		}
		return oauthConfig{s.cfg.GitHubClientID, s.cfg.GitHubClientSecret,
			"https://github.com/login/oauth/authorize", "https://github.com/login/oauth/access_token",
			"https://api.github.com/user", "read:user user:email"}, nil
	default:
		return oauthConfig{}, platform.ErrBadRequest("unsupported OAuth provider")
	}
}

func (s *Service) StartOAuth(ctx context.Context, provider string) (string, error) {
	config, err := s.oauthProvider(provider)
	if err != nil {
		return "", err
	}
	state, err := randomToken(24)
	if err != nil {
		return "", err
	}
	payload, _ := json.Marshal(map[string]string{"provider": provider})
	if err := s.db.WithContext(ctx).Exec(`INSERT INTO auth.identity_tokens
		(kind, token_digest, payload, expires_at) VALUES ('oauth_state', ?, ?::jsonb, ?)`,
		s.tokenDigest(state), string(payload), s.now().Add(10*time.Minute)).Error; err != nil {
		return "", err
	}
	callback := strings.TrimRight(s.cfg.AppPublicURL, "/") + "/api/v1/auth/oauth/" + provider + "/callback"
	query := url.Values{"client_id": {config.ClientID}, "redirect_uri": {callback}, "response_type": {"code"}, "scope": {config.Scope}, "state": {state}}
	return config.AuthURL + "?" + query.Encode(), nil
}

func (s *Service) FinishOAuth(ctx context.Context, provider, code, state, userAgent, ip, deviceID string) (*AuthResult, error) {
	config, err := s.oauthProvider(provider)
	if err != nil {
		return nil, err
	}
	var payload []byte
	result := s.db.WithContext(ctx).Raw(`UPDATE auth.identity_tokens SET consumed_at = now()
		WHERE kind = 'oauth_state' AND token_digest IN ? AND consumed_at IS NULL AND expires_at > now()
		AND payload->>'provider' = ? RETURNING payload`, s.tokenDigests(state), provider).Scan(&payload)
	if result.Error != nil || result.RowsAffected == 0 {
		return nil, platform.ErrBadRequest("invalid or expired OAuth state")
	}
	callback := strings.TrimRight(s.cfg.AppPublicURL, "/") + "/api/v1/auth/oauth/" + provider + "/callback"
	form := url.Values{"client_id": {config.ClientID}, "client_secret": {config.ClientSecret}, "code": {code}, "redirect_uri": {callback}}
	request, _ := http.NewRequestWithContext(ctx, http.MethodPost, config.TokenURL, strings.NewReader(form.Encode()))
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Accept", "application/json")
	response, err := (&http.Client{Timeout: 5 * time.Second}).Do(request)
	if err != nil {
		return nil, unavailable("OAuth provider unavailable")
	}
	defer response.Body.Close()
	var tokenResponse struct {
		AccessToken string `json:"access_token"`
	}
	if response.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&tokenResponse) != nil || tokenResponse.AccessToken == "" {
		return nil, platform.ErrBadRequest("OAuth code exchange failed")
	}
	email, name, err := fetchOAuthIdentity(ctx, provider, config.UserURL, tokenResponse.AccessToken)
	if err != nil {
		return nil, err
	}
	user, err := findUserByEmail(s.db.WithContext(ctx), email)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		password, tokenErr := randomToken(32)
		if tokenErr != nil {
			return nil, tokenErr
		}
		user, err = s.Register(ctx, email, password+"Aa!", name)
	}
	if err != nil || user.Status != "active" {
		return nil, ErrBadCredentials()
	}
	auth, err := s.startSession(ctx, user, userAgent, ip, deviceID)
	if err == nil {
		s.auditAuth(ctx, "oauth."+provider+".succeeded", strconv.FormatInt(user.ID, 10), map[string]any{"ip": ip})
		s.recordLoginEvent(ctx, user, ip, userAgent, nil)
	}
	return auth, err
}

func fetchOAuthIdentity(ctx context.Context, provider, endpoint, token string) (string, string, error) {
	request, _ := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "go-platform-starter")
	response, err := (&http.Client{Timeout: 5 * time.Second}).Do(request)
	if err != nil {
		return "", "", unavailable("OAuth profile unavailable")
	}
	defer response.Body.Close()
	var profile struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Login         string `json:"login"`
	}
	if response.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&profile) != nil {
		return "", "", platform.ErrBadRequest("OAuth profile response was invalid")
	}
	if provider == "github" {
		profile.Email = ""
		emailRequest, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user/emails", nil)
		emailRequest.Header = request.Header.Clone()
		emailResponse, emailErr := (&http.Client{Timeout: 5 * time.Second}).Do(emailRequest)
		if emailErr == nil {
			defer emailResponse.Body.Close()
			var emails []struct {
				Email    string `json:"email"`
				Primary  bool   `json:"primary"`
				Verified bool   `json:"verified"`
			}
			if json.NewDecoder(io.LimitReader(emailResponse.Body, 1<<20)).Decode(&emails) == nil {
				for _, candidate := range emails {
					if candidate.Primary && candidate.Verified {
						profile.Email = candidate.Email
					}
				}
			}
		}
	}
	if provider == "google" && !profile.EmailVerified {
		return "", "", platform.ErrBadRequest("OAuth provider did not return a verified email")
	}
	if !strings.Contains(profile.Email, "@") {
		return "", "", platform.ErrBadRequest("OAuth provider did not return a verified email")
	}
	if profile.Name == "" {
		profile.Name = profile.Login
	}
	return lower(profile.Email), strings.TrimSpace(profile.Name), nil
}

func unavailable(detail string) *platform.AppError {
	return &platform.AppError{Status: http.StatusServiceUnavailable, Message: "unavailable", Detail: detail}
}
