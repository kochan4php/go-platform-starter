package internal

import (
	"context"
	"errors"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// PurgeList is the durable retry channel for profile deletions. The
// user.deleted stream event is the fast path; entries also land here so a
// lost stream message still gets cleaned up by the periodic sweep.
const PurgeList = "purge:profiles"

func QueueProfilePurge(ctx context.Context, rdb *redis.Client, sub string) error {
	return rdb.RPush(ctx, PurgeList, sub).Err()
}

// PurgeDeletedProfiles drains the purge list and deletes the matching profile
// rows (PLAN item 52 — schema-touching housekeeping stays in the owning
// service, run via the platform scheduler's single-runner lock).
//
// ponytail: pop-then-delete loses one entry if the worker dies between the
// two steps; LMOVE to a processing list if that ever matters.
func PurgeDeletedProfiles(ctx context.Context, rdb *redis.Client, db *gorm.DB) (int64, error) {
	var purged int64
	for ctx.Err() == nil {
		sub, err := rdb.LPop(ctx, PurgeList).Result()
		if errors.Is(err, redis.Nil) {
			return purged, nil
		}
		if err != nil {
			return purged, err
		}
		res := db.WithContext(ctx).Exec(`DELETE FROM users.users WHERE id = ?`, sub)
		if res.Error != nil {
			return purged, res.Error
		}
		purged += res.RowsAffected
	}
	return purged, nil
}
