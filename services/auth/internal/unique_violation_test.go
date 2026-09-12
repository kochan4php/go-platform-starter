package internal

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

// The concurrent-registration winner is decided by uq_users_email_active, so
// the loser must come back as a 409 and not as whatever the driver wrapped the
// constraint error in.
func TestIsUniqueViolation(t *testing.T) {
	unique := &pgconn.PgError{Code: "23505", Message: "duplicate key value violates unique constraint"}
	for _, tc := range []struct {
		name string
		err  error
		want bool
	}{
		{"bare unique violation", unique, true},
		{"wrapped unique violation", fmt.Errorf("insert user: %w", unique), true},
		{"a different pg error", &pgconn.PgError{Code: "23503"}, false},
		{"not a pg error", errors.New("connection reset"), false},
		{"no error", nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := isUniqueViolation(tc.err); got != tc.want {
				t.Fatalf("isUniqueViolation(%v) = %v, want %v", tc.err, got, tc.want)
			}
		})
	}
}
