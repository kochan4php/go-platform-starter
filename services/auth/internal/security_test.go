package internal

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestArgonPasswordHistoryAndTOTP(t *testing.T) {
	hash, err := hashPassword("Strong-password-7", "argon2id", 4)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(hash, "$argon2id$") || !verifyPassword(hash, "Strong-password-7") {
		t.Fatal("argon2id hash did not verify")
	}
	if verifyPassword(hash, "wrong") || !passwordHistoryContains([]string{hash}, "Strong-password-7") {
		t.Fatal("password verification/history mismatch")
	}
	if verifyPassword("$argon2id$v=19$m=4294967295,t=9,p=16$c2FsdHNhbHQ$aGFzaA", "anything") {
		t.Fatal("unsafe Argon2 parameters accepted")
	}

	secret := "JBSWY3DPEHPK3PXP"
	now := time.Unix(1_700_000_000, 0)
	code, err := totpCode(secret, now)
	if err != nil || !verifyTOTP(secret, code, now) || verifyTOTP(secret, "000000", now) {
		t.Fatalf("TOTP result code=%q err=%v", code, err)
	}
}

func TestHIBPKAnonymityRejectsMatchingSuffix(t *testing.T) {
	password := "Breached-password-7"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if len(strings.TrimPrefix(r.URL.Path, "/")) != 5 || r.Header.Get("Add-Padding") != "true" {
			t.Error("HIBP request did not use a five-character prefix and padding")
		}
		sum := sha1Hex(password)
		_, _ = fmt.Fprintf(w, "%s:99\n", sum[5:])
	}))
	defer server.Close()
	if err := checkHIBP(context.Background(), server.URL, password); err == nil {
		t.Fatal("breached password accepted")
	}
}
