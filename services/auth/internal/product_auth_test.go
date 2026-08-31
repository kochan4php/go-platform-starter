package internal

import (
	"context"
	"testing"
)

func TestUnknownFailedLoginIsHighRisk(t *testing.T) {
	service := &Service{}
	if score := service.loginRisk(context.Background(), nil, "203.0.113.4", "test", true); score != 60 {
		t.Fatalf("risk score = %d, want 60", score)
	}
}
