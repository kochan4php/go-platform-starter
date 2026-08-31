package internal

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// revokedGrace keeps recently-revoked sessions around briefly for audit /
// "sign out other devices" forensics before the sweep removes them.
const revokedGrace = 7 * 24 * time.Hour

// SweepSessions deletes sessions that can never authenticate again: expired,
// or revoked longer than the grace window ago. Runs inside auth via the
// platform scheduler (PLAN item 52 — schema-touching housekeeping stays in
// the owning service; zero cross-schema writes).
func SweepSessions(ctx context.Context, db *gorm.DB) (int64, error) {
	cutoff := time.Now().Add(-revokedGrace)
	var affected int64
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, query := range []struct {
			statement string
			args      []any
		}{
			{`DELETE FROM auth.sessions WHERE expires_at < now() OR (revoked_at IS NOT NULL AND revoked_at < ?)`, []any{cutoff}},
			{`DELETE FROM auth.identity_tokens WHERE expires_at < now() OR consumed_at < now() - interval '7 days'`, nil},
			{`DELETE FROM auth.login_events WHERE created_at < now() - interval '90 days'`, nil},
		} {
			result := tx.Exec(query.statement, query.args...)
			if result.Error != nil {
				return result.Error
			}
			affected += result.RowsAffected
		}
		return nil
	})
	return affected, err
}
