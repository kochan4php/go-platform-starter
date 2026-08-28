package internal

import (
	"github.com/kochan4php/go-platform-starter/internal/platform"
)

type AccessClaims = platform.AccessClaims

func ParseAccess(keyRing, raw string) (*AccessClaims, error) {
	return platform.ParseAccessTokenRing(keyRing, raw)
}

func HasPerm(perms []string, want string) bool {
	for _, p := range perms {
		if p == want {
			return true
		}
	}
	return false
}
