package internal

import (
	"testing"
	"time"
)

func BenchmarkListCursor(b *testing.B) {
	createdAt := time.Date(2026, time.August, 28, 12, 0, 0, 123, time.UTC)
	b.ReportAllocs()
	for b.Loop() {
		cursor := encodeListCursor(createdAt, 100_000)
		if _, err := decodeListCursor(cursor); err != nil {
			b.Fatal(err)
		}
	}
}

func TestListCursorRoundTripAndSparseFields(t *testing.T) {
	createdAt := time.Date(2026, time.August, 28, 12, 0, 0, 123, time.UTC)
	cursor, err := decodeListCursor(encodeListCursor(createdAt, 42))
	if err != nil || !cursor.CreatedAt.Equal(createdAt) || cursor.ID != 42 {
		t.Fatalf("cursor round trip = %#v, %v", cursor, err)
	}
	projected, err := sparseProfiles([]Profile{{ID: 42, Email: "user@example.test"}}, "id,email")
	if err != nil {
		t.Fatal(err)
	}
	rows := projected.([]map[string]any)
	if rows[0]["id"] != int64(42) || rows[0]["email"] != "user@example.test" {
		t.Fatalf("sparse projection = %#v", rows)
	}
	if _, err := sparseProfiles([]Profile{{ID: 42}}, "passwordHash"); err == nil {
		t.Fatal("unknown sparse field accepted")
	}
}
