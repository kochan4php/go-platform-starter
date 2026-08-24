package internal

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

func jwtMintForTest(t *testing.T, sub string) string {
	t.Helper()
	now := time.Now()
	claims := platform.AccessClaims{
		Purpose: "access", Sub: sub, Email: sub + "@x.local",
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour)),
		},
	}
	s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testSecret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func newTestRedis(addr string) *redis.Client {
	return redis.NewClient(&redis.Options{Addr: addr})
}

func jsonUnmarshal(raw []byte, dst any) error { return json.Unmarshal(raw, dst) }
