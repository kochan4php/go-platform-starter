package platform

import (
	"context"
	"testing"
)

func TestRunBackfillStopsAfterPartialBatch(t *testing.T) {
	remaining := 7
	total, err := RunBackfill(context.Background(), 3, func(context.Context, int) (int, error) {
		if remaining >= 3 {
			remaining -= 3
			return 3, nil
		}
		processed := remaining
		remaining = 0
		return processed, nil
	})
	if err != nil || total != 7 {
		t.Fatalf("RunBackfill() = %d, %v; want 7, nil", total, err)
	}
}

func TestRunBackfillRejectsInvalidCount(t *testing.T) {
	if _, err := RunBackfill(context.Background(), 2, func(context.Context, int) (int, error) { return 3, nil }); err == nil {
		t.Fatal("expected invalid batch count error")
	}
}
