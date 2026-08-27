package internal

import "testing"

func TestUserOrderClause(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name     string
		sort     string
		order    string
		expected string
	}{
		{name: "defaults safely", sort: "unknown", order: "sideways", expected: "created_at DESC NULLS LAST"},
		{name: "sorts display name ascending", sort: "displayName", order: "asc", expected: "display_name ASC NULLS LAST"},
		{name: "sorts last login descending", sort: "lastLoginAt", order: "desc", expected: "last_login_at DESC NULLS LAST"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if got := userOrderClause(test.sort, test.order); got != test.expected {
				t.Fatalf("userOrderClause(%q, %q) = %q, want %q", test.sort, test.order, got, test.expected)
			}
		})
	}
}

func TestListFiltersZeroValue(t *testing.T) {
	t.Parallel()
	filters := ListFilters{}
	if filters.Query != "" || filters.Presence != "" || filters.RoleID != 0 || filters.RegisteredFrom != nil || filters.RegisteredTo != nil {
		t.Fatal("zero-value ListFilters must leave the list query unfiltered")
	}
}
