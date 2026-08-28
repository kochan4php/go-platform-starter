package platform

import (
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type SigningKeys struct {
	ActiveKid string
	Keys      map[string][]byte
}

// ParseSigningKeys accepts "kid:secret,kid2:previous". A legacy plain secret
// remains valid as kid "default", so rotation can be rolled out gradually.
func ParseSigningKeys(raw string) (SigningKeys, error) {
	ring := SigningKeys{Keys: map[string][]byte{}}
	for _, item := range strings.Split(raw, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		kid, secret := "default", item
		if before, after, ok := strings.Cut(item, ":"); ok {
			kid, secret = strings.TrimSpace(before), strings.TrimSpace(after)
		}
		if kid == "" || secret == "" {
			return SigningKeys{}, fmt.Errorf("invalid signing key entry")
		}
		if _, duplicate := ring.Keys[kid]; duplicate {
			return SigningKeys{}, fmt.Errorf("duplicate signing key id %q", kid)
		}
		if ring.ActiveKid == "" {
			ring.ActiveKid = kid
		}
		ring.Keys[kid] = []byte(secret)
	}
	if ring.ActiveKid == "" {
		return SigningKeys{}, fmt.Errorf("at least one signing key is required")
	}
	return ring, nil
}

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
	return ParseAccessTokenRing(string(secret), raw)
}

func ParseAccessTokenRing(rawKeys, raw string) (*AccessClaims, error) {
	ring, err := ParseSigningKeys(rawKeys)
	if err != nil {
		return nil, fmt.Errorf("invalid token")
	}
	tok, err := jwt.ParseWithClaims(raw, &AccessClaims{}, func(t *jwt.Token) (any, error) {
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
