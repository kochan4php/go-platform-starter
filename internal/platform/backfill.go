package platform

import (
	"context"
	"fmt"
)

// RunBackfill repeatedly invokes a small idempotent batch until it returns
// fewer rows than requested. The callback owns its transaction and checkpoint,
// allowing resume after interruption without a framework-specific table.
func RunBackfill(ctx context.Context, batchSize int, batch func(context.Context, int) (int, error)) (int, error) {
	if batchSize < 1 {
		return 0, fmt.Errorf("batch size must be positive")
	}
	total := 0
	for {
		if err := ctx.Err(); err != nil {
			return total, err
		}
		processed, err := batch(ctx, batchSize)
		if err != nil {
			return total, err
		}
		if processed < 0 || processed > batchSize {
			return total, fmt.Errorf("backfill batch returned invalid count %d", processed)
		}
		total += processed
		if processed < batchSize {
			return total, nil
		}
	}
}
