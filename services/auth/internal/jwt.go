package internal

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

const (
	PurposeAccess = "access"
	PurposeReset  = "reset"
)

func randomToken(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("rand: %w", err)
	}
	return hex.EncodeToString(b), nil
}

type Claims struct {
	Purpose string   `json:"purpose"`
	Sub     string   `json:"sub,omitempty"`
	Email   string   `json:"email,omitempty"`
	JTI     string   `json:"jti,omitempty"`
	Ver     int64    `json:"ver,omitempty"`
	Perms   []string `json:"perms,omitempty"`
	jwt.RegisteredClaims
}

func mint(secret []byte, claims Claims) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(secret)
}

func mintWithRing(rawKeys string, claims Claims) (string, error) {
	ring, err := platform.ParseSigningKeys(rawKeys)
	if err != nil {
		return "", err
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t.Header["kid"] = ring.ActiveKid
	return t.SignedString(ring.Keys[ring.ActiveKid])
}

func MintAccess(secret []byte, sub, email string, ver int64, perms []string, ttl time.Duration) (string, error) {
	return MintAccessWithRing(string(secret), sub, email, ver, perms, ttl)
}

func MintAccessWithRing(rawKeys, sub, email string, ver int64, perms []string, ttl time.Duration) (string, error) {
	now := time.Now()
	return mintWithRing(rawKeys, Claims{
		Purpose: PurposeAccess,
		Sub:     sub,
		Email:   email,
		Ver:     ver,
		Perms:   perms,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	})
}

func MintReset(secret []byte, sub, jti string, ttl time.Duration) (string, error) {
	return MintResetWithRing(string(secret), sub, jti, ttl)
}

func MintResetWithRing(rawKeys, sub, jti string, ttl time.Duration) (string, error) {
	now := time.Now()
	return mintWithRing(rawKeys, Claims{
		Purpose: PurposeReset,
		Sub:     sub,
		JTI:     jti,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	})
}

func ParseToken(secret []byte, raw, wantPurpose string) (*Claims, error) {
	return ParseTokenWithRing(string(secret), raw, wantPurpose)
}

func ParseTokenWithRing(rawKeys, raw, wantPurpose string) (*Claims, error) {
	ring, err := platform.ParseSigningKeys(rawKeys)
	if err != nil {
		return nil, fmt.Errorf("invalid token")
	}
	tok, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		kid, _ := t.Header["kid"].(string)
		if kid == "" && len(ring.Keys) == 1 {
			kid = ring.ActiveKid
		}
		key, ok := ring.Keys[kid]
		if !ok {
			return nil, fmt.Errorf("unknown signing key")
		}
		return key, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !tok.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	c, ok := tok.Claims.(*Claims)
	if !ok || c.Purpose != wantPurpose {
		return nil, fmt.Errorf("invalid token")
	}
	return c, nil
}
