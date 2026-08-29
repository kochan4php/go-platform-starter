package internal

import (
	"strings"
	"testing"
)

func TestPermissionAndRoleNameValidation(t *testing.T) {
	t.Parallel()
	for _, test := range []struct {
		name string
		got  bool
		want bool
	}{
		{"valid permission", validPermissionName("report:export:any"), true},
		{"missing scope", validPermissionName("report:export"), false},
		{"uppercase permission", validPermissionName("Report:export:any"), false},
		{"valid role", validRoleName("support-operator"), true},
		{"one-character role", validRoleName("a"), false},
		{"space in role", validRoleName("support operator"), false},
	} {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if test.got != test.want {
				t.Fatalf("got %v, want %v", test.got, test.want)
			}
		})
	}
}

func FuzzPermissionNameGrammar(f *testing.F) {
	for _, seed := range []string{"user:read:any", "report:export:own", "User:read:any", "a:b", "x:y:z;DROP TABLE"} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, value string) {
		got := validPermissionName(value)
		want := permNameRe.MatchString(strings.TrimSpace(value))
		if got != want {
			t.Fatalf("validator disagrees with grammar for %q", value)
		}
	})
}

func TestUniqueValuesPreserveOrder(t *testing.T) {
	t.Parallel()
	strings := uniqueStrings([]string{"user:read:any", " user:read:any ", "", "role:read:any"})
	if len(strings) != 2 || strings[0] != "user:read:any" || strings[1] != "role:read:any" {
		t.Fatalf("unexpected permission set: %#v", strings)
	}
	ids := uniqueInt64s([]int64{2, 2, 0, -1, 3})
	if len(ids) != 2 || ids[0] != 2 || ids[1] != 3 {
		t.Fatalf("unexpected role ids: %#v", ids)
	}
}

func TestNormalizeRoleInput(t *testing.T) {
	t.Parallel()
	input, err := normalizeRoleInput(RoleInput{Name: " Support ", Permissions: []string{"user:read:any"}})
	if err != nil {
		t.Fatal(err)
	}
	if input.Name != "support" || input.Color != "#6366f1" || input.Icon != "shield" {
		t.Fatalf("unexpected normalized role: %#v", input)
	}
	if _, err := normalizeRoleInput(RoleInput{Name: "system"}); err == nil {
		t.Fatal("reserved role name should fail")
	}
}
