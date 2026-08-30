package platform

import (
	"context"
	"fmt"
	"regexp"

	"gorm.io/gorm"
)

var sqlIdentifier = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)

// RunSeedVersion executes a seed exactly once and records it in the owning
// schema. Seed functions remain idempotent so interrupted runs are safe.
func RunSeedVersion(ctx context.Context, db *gorm.DB, schema, version string, seed func(*gorm.DB) error) error {
	if !sqlIdentifier.MatchString(schema) || version == "" {
		return fmt.Errorf("invalid seed schema or version")
	}
	table := schema + ".seed_history"
	if err := db.WithContext(ctx).Exec(fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (
		version TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
	)`, table)).Error; err != nil {
		return err
	}
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Table(table).Where("version = ?", version).Count(&count).Error; err != nil || count > 0 {
			return err
		}
		if err := seed(tx); err != nil {
			return err
		}
		return tx.Exec("INSERT INTO "+table+" (version) VALUES (?)", version).Error
	})
}
