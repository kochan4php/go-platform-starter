package platform

import (
	"net/url"
	"testing"
)

func TestDatabaseTimeoutsPreserveDSN(t *testing.T) {
	t.Setenv("DB_STATEMENT_TIMEOUT", "7s")
	t.Setenv("DB_IDLE_TX_TIMEOUT", "11s")
	raw := databaseTimeouts("postgres://app:secret@db:5432/app?sslmode=require")
	parsed, err := url.Parse(raw)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Query().Get("sslmode") != "require" {
		t.Fatal("sslmode was not preserved")
	}
	if parsed.Query().Get("statement_timeout") != "7000" {
		t.Fatalf("statement timeout = %q", parsed.Query().Get("statement_timeout"))
	}
	if parsed.Query().Get("idle_in_transaction_session_timeout") != "11000" {
		t.Fatalf("idle timeout = %q", parsed.Query().Get("idle_in_transaction_session_timeout"))
	}
}

func TestFeatureEnabled(t *testing.T) {
	t.Setenv("FEATURE_BETA_SEARCH", "true")
	if !FeatureEnabled("beta-search", false) {
		t.Fatal("enabled feature evaluated false")
	}
	t.Setenv("FEATURE_BETA_SEARCH", "not-a-bool")
	if FeatureEnabled("beta-search", true) {
		t.Fatal("invalid value must fail closed")
	}
}
