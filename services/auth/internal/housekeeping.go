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
	res := db.WithContext(ctx).Exec(
		`DELETE FROM auth.sessions
		 WHERE expires_at < now()
		    OR (revoked_at IS NOT NULL AND revoked_at < now() - ?)`, revokedGrace)
	return res.RowsAffected, res.Error
}
