package internal

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base32"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	qrcode "github.com/skip2/go-qrcode"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type MFAEnrollment struct {
	Secret     string `json:"secret"`
	OTPAuthURI string `json:"otpauthUri"`
	QRDataURL  string `json:"qrDataUrl"`
}

func totpCode(secret string, at time.Time) (string, error) {
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(strings.TrimSpace(secret)))
	if err != nil {
		return "", err
	}
	counter := uint64(at.Unix() / 30)
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, counter)
	mac := hmac.New(sha1.New, key)
	_, _ = mac.Write(buf)
	sum := mac.Sum(nil)
	offset := sum[len(sum)-1] & 0x0f
	value := (uint32(sum[offset])&0x7f)<<24 | uint32(sum[offset+1])<<16 | uint32(sum[offset+2])<<8 | uint32(sum[offset+3])
	return fmt.Sprintf("%06d", value%1_000_000), nil
}

func verifyTOTP(secret, code string, at time.Time) bool {
	if len(code) != 6 {
		return false
	}
	matched := false
	for step := -1; step <= 1; step++ {
		want, err := totpCode(secret, at.Add(time.Duration(step)*30*time.Second))
		if err == nil {
			matched = hmac.Equal([]byte(want), []byte(code)) || matched
		}
	}
	return matched
}

func (s *Service) BeginMFA(ctx context.Context, userID int64) (*MFAEnrollment, error) {
	var user User
	if err := s.db.WithContext(ctx).First(&user, "id = ?", userID).Error; err != nil {
		return nil, platform.ErrNotFound("user %d not found", userID)
	}
	raw := make([]byte, 20)
	if _, err := rand.Read(raw); err != nil {
		return nil, err
	}
	secret := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(raw)
	sub := strconv.FormatInt(userID, 10)
	encrypted, err := platform.EncryptForSubject(platform.ActiveSecret(s.cryptoRing()), sub, "mfa-pending", secret)
	if err != nil {
		return nil, err
	}
	if err := s.rdb.Set(ctx, "mfa:pending:"+sub, encrypted, 10*time.Minute).Err(); err != nil {
		return nil, err
	}
	issuer := "Platform Console"
	uri := "otpauth://totp/" + url.PathEscape(issuer+":"+user.Email) + "?secret=" + url.QueryEscape(secret) + "&issuer=" + url.QueryEscape(issuer) + "&algorithm=SHA1&digits=6&period=30"
	png, err := qrcode.Encode(uri, qrcode.Medium, 256)
	if err != nil {
		return nil, err
	}
	return &MFAEnrollment{Secret: secret, OTPAuthURI: uri, QRDataURL: "data:image/png;base64," + base64.StdEncoding.EncodeToString(png)}, nil
}

func (s *Service) VerifyMFAEnrollment(ctx context.Context, userID int64, code string) error {
	sub := strconv.FormatInt(userID, 10)
	encrypted, err := s.rdb.Get(ctx, "mfa:pending:"+sub).Result()
	if err != nil {
		return platform.ErrBadRequest("MFA enrollment expired; start again")
	}
	secret, err := platform.DecryptForSubject(s.cryptoRing(), sub, "mfa-pending", encrypted)
	if err != nil || !verifyTOTP(secret, code, s.now()) {
		return platform.ErrBadRequest("invalid authenticator code")
	}
	stored, err := platform.EncryptForSubject(platform.ActiveSecret(s.cryptoRing()), sub, "mfa-secret", secret)
	if err != nil {
		return err
	}
	if err := s.db.WithContext(ctx).Table("users.users").Where("id = ?", userID).Updates(map[string]any{
		"mfa_secret_enc": stored, "mfa_enabled": true,
	}).Error; err != nil {
		return err
	}
	_ = s.rdb.Del(ctx, "mfa:pending:"+sub).Err()
	s.auditAuth(ctx, "mfa.enabled", sub, nil)
	return nil
}

func (s *Service) verifyMFA(user *User, code string) error {
	if !user.MFAEnabled {
		return nil
	}
	if strings.TrimSpace(code) == "" {
		return &platform.AppError{Status: 401, Message: "mfa_required", Detail: "authenticator code required"}
	}
	sub := strconv.FormatInt(user.ID, 10)
	secret, err := platform.DecryptForSubject(s.cryptoRing(), sub, "mfa-secret", user.MFASecretEnc)
	if err != nil || !verifyTOTP(secret, code, s.now()) {
		return ErrBadCredentials()
	}
	return nil
}
