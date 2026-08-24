// Package permissions holds the compile-time permission catalog — the single
// source of truth imported by the rbac seeder AND the gateway's fail-closed
// boot validation (PLAN items 26/33). Format: <resource>:<action>:<scope>.
package permissions

import "fmt"

var catalog = []string{
	"user:create:any",
	"user:read:any",
	"user:update:any",
	"user:delete:any",

	"role:create:any",
	"role:read:any",
	"role:update:any",
	"role:delete:any",

	"permission:read:any",

	"audit:read:any",
}

// All returns every known permission string.
func All() []string {
	out := make([]string, len(catalog))
	copy(out, catalog)
	return out
}

// IsValid reports whether p exists in the catalog.
func IsValid(p string) bool {
	for _, c := range catalog {
		if c == p {
			return true
		}
	}
	return false
}

func MustValid(p string) {
	if !IsValid(p) {
		panic(fmt.Sprintf("permission %q is not in the compile-time catalog — fix it before shipping a dead route", p))
	}
}
