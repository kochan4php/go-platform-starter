package platform

import (
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// AccessClaims is the minimal claim set every edge-verified service needs.
// auth mints the full token; gateway/realtime/users only read it.
type AccessClaims struct {
	Purpose string   `json:"purpose"`
	Sub     string   `json:"sub"`
	Email   string   `json:"email"`
	Ver     int64    `json:"ver"`
	Perms   []string `json:"perms"`
	jwt.RegisteredClaims
}

func ParseAccessToken(secret []byte, raw string) (*AccessClaims, error) {
	tok, err := jwt.ParseWithClaims(raw, &AccessClaims{}, func(t *jwt.Token) (any, error) {
		return secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !tok.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	c, ok := tok.Claims.(*AccessClaims)
	if !ok || c.Purpose != "access" || c.Sub == "" {
		return nil, fmt.Errorf("invalid token")
	}
	return c, nil
}

func HasPerm(perms []string, want string) bool {
	for _, p := range perms {
		if p == want {
			return true
		}
	}
	return false
}
