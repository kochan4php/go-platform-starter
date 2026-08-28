package internal

import "testing"

func FuzzValidateProfileFields(f *testing.F) {
	f.Add("Normal name", "https://example.com/avatar.png")
	f.Add("<img src=x onerror=alert(1)>", "javascript:alert(1)")
	f.Fuzz(func(t *testing.T, name, avatar string) {
		if len(name) > 1024 || len(avatar) > 4096 {
			t.Skip()
		}
		_ = validateProfileFields(&name, &avatar)
	})
}

func TestProfileSecurityValidation(t *testing.T) {
	for _, test := range []struct{ name, avatar string }{
		{"<script>alert(1)</script>", ""},
		{"safe", "javascript:alert(1)"},
		{"safe", "https://127.0.0.1/private"},
	} {
		if err := validateProfileFields(&test.name, &test.avatar); err == nil {
			t.Fatalf("unsafe profile accepted: %#v", test)
		}
	}
}

func FuzzUserOrderClauseNeverIncludesInput(f *testing.F) {
	f.Add("createdAt", "desc")
	f.Add("created_at; DROP TABLE users.users;--", "asc NULLS FIRST")
	f.Fuzz(func(t *testing.T, sort, order string) {
		got := userOrderClause(sort, order)
		allowed := map[string]bool{
			"created_at ASC NULLS LAST": true, "created_at DESC NULLS LAST": true,
			"display_name ASC NULLS LAST": true, "display_name DESC NULLS LAST": true,
			"email ASC NULLS LAST": true, "email DESC NULLS LAST": true,
			"last_login_at ASC NULLS LAST": true, "last_login_at DESC NULLS LAST": true,
		}
		if !allowed[got] {
			t.Fatalf("unsafe order clause %q from %q/%q", got, sort, order)
		}
	})
}
