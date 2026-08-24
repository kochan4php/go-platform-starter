package internal

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
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

func MintAccess(secret []byte, sub, email string, ver int64, perms []string, ttl time.Duration) (string, error) {
	now := time.Now()
	return mint(secret, Claims{
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
	now := time.Now()
	return mint(secret, Claims{
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
	tok, err := jwt.ParseWithClaims(raw, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return secret, nil
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
