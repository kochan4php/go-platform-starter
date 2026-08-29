package internal

import (
	"context"
	"time"

	"gorm.io/gorm"
)

const profileRetention = 30 * 24 * time.Hour

// PurgeDeletedProfiles permanently deletes profiles whose retention window
// has elapsed. Schema-touching housekeeping stays in the owning service and
// runs through the platform scheduler's single-runner lock.
func PurgeDeletedProfiles(ctx context.Context, db *gorm.DB) (int64, error) {
	result := db.WithContext(ctx).Exec(
		`DELETE FROM users.users WHERE deleted_at IS NOT NULL AND deleted_at <= ?`,
		time.Now().Add(-profileRetention),
	)
	return result.RowsAffected, result.Error
}

// RefreshReadModels updates dashboard projections without blocking readers.
func RefreshReadModels(ctx context.Context, db *gorm.DB) error {
	if err := db.WithContext(ctx).Exec(`REFRESH MATERIALIZED VIEW CONCURRENTLY users.dashboard_stats`).Error; err != nil {
		return err
	}
	return db.WithContext(ctx).Exec(`REFRESH MATERIALIZED VIEW CONCURRENTLY users.registration_daily`).Error
}
