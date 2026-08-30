package main

import (
	"strings"
	"testing"
)

func TestRenderersIncludeDictionaryAndERD(t *testing.T) {
	c := catalog{Columns: []column{{Schema: "users", Table: "users", Name: "id", Type: "bigint", Identity: true}, {Schema: "users", Table: "users", Name: "email", Type: "text", Comment: "Login email"}}}
	if got := markdown(c); !strings.Contains(got, "`users.users`") || !strings.Contains(got, "Login email") {
		t.Fatalf("markdown missing dictionary content: %s", got)
	}
	if got := dbml(c); !strings.Contains(got, "Table users_users") || !strings.Contains(got, "id bigint [not null, increment]") {
		t.Fatalf("dbml missing table content: %s", got)
	}
}

func TestAuditFlagsTimestampAndConstraintNaming(t *testing.T) {
	c := catalog{
		Columns:     []column{{Schema: "x", Table: "rows", Name: "created_at", Type: "timestamp without time zone"}},
		Constraints: []constraint{{Schema: "x", Table: "rows", Name: "rows_value_check", Kind: "c"}},
	}
	got := audit(c)
	if !strings.Contains(got, "timestamp without time zone") || !strings.Contains(got, "rows_value_check") {
		t.Fatalf("audit did not flag governance drift: %s", got)
	}
}
