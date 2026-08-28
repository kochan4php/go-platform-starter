package platform

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestDatabaseEnvironmentDefaultsAndOverrides(t *testing.T) {
	t.Setenv("DB_MAX_OPEN_CONNS", "32")
	t.Setenv("DB_PREPARE_STMT", "false")
	t.Setenv("DB_CONN_MAX_LIFETIME", "45m")
	if got := envInt("DB_MAX_OPEN_CONNS", 16); got != 32 {
		t.Fatalf("max open = %d", got)
	}
	if envBool("DB_PREPARE_STMT", true) {
		t.Fatal("prepare statement override ignored")
	}
	if got := envDuration("DB_CONN_MAX_LIFETIME", time.Minute); got != 45*time.Minute {
		t.Fatalf("lifetime = %s", got)
	}
}

func BenchmarkWriteJSON(b *testing.B) {
	payload := struct {
		Success bool     `json:"success"`
		Items   []string `json:"items"`
	}{true, []string{"alpha", "beta", "gamma"}}
	b.ReportAllocs()
	for b.Loop() {
		recorder := httptest.NewRecorder()
		WriteJSON(recorder, 200, payload)
	}
}
