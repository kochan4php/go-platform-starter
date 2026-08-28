package internal

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/sha1" // HIBP's k-anonymity API is defined in terms of SHA-1 prefixes.
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

const (
	argonTime    = 2
	argonMemory  = 64 * 1024
	argonThreads = 2
	argonKeyLen  = 32
)

func RandomPassword() (string, error) { return randomToken(12) }

func validatePasswordComplexity(password, email string) error {
	if len(password) < 12 || len(password) > 72 {
		return platform.ErrBadRequest("password must be 12 to 72 characters")
	}
	classes := 0
	var lower, upper, digit, symbol bool
	for _, r := range password {
		switch {
		case unicode.IsLower(r):
			lower = true
		case unicode.IsUpper(r):
			upper = true
		case unicode.IsDigit(r):
			digit = true
		default:
			symbol = true
		}
	}
	for _, present := range []bool{lower, upper, digit, symbol} {
		if present {
			classes++
		}
	}
	if classes < 3 {
		return platform.ErrBadRequest("password must use at least three character classes")
	}
	local, _, _ := strings.Cut(strings.ToLower(strings.TrimSpace(email)), "@")
	if len(local) >= 4 && strings.Contains(strings.ToLower(password), local) {
		return platform.ErrBadRequest("password must not contain your email name")
	}
	return nil
}

func checkHIBP(ctx context.Context, endpoint, password string) error {
	if strings.TrimSpace(endpoint) == "" {
		return nil
	}
	hexSum := sha1Hex(password)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(endpoint, "/")+"/"+hexSum[:5], nil)
	if err != nil {
		return err
	}
	req.Header.Set("Add-Padding", "true")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("breached-password check unavailable: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("breached-password check returned %d", res.StatusCode)
	}
	scanner := bufio.NewScanner(res.Body)
	for scanner.Scan() {
		suffix, _, _ := strings.Cut(scanner.Text(), ":")
		if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(suffix)), []byte(hexSum[5:])) == 1 {
			return platform.ErrBadRequest("password appears in a known breach; choose another")
		}
	}
	return scanner.Err()
}

func sha1Hex(value string) string {
	sum := sha1.Sum([]byte(value))
	return strings.ToUpper(hex.EncodeToString(sum[:]))
}

func hashPassword(password, algorithm string, bcryptCost int) (string, error) {
	if strings.EqualFold(algorithm, "argon2id") {
		salt := make([]byte, 16)
		if _, err := rand.Read(salt); err != nil {
			return "", err
		}
		hash := argon2.IDKey([]byte(password), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
		return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", argonMemory, argonTime, argonThreads,
			base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(hash)), nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	return string(hash), err
}

func CalibrateBcryptCost(target time.Duration) int {
	if target <= 0 {
		target = 250 * time.Millisecond
	}
	password := []byte("startup-calibration-only")
	for cost := bcrypt.MinCost; cost <= 14; cost++ {
		started := time.Now()
		_, _ = bcrypt.GenerateFromPassword(password, cost)
		if time.Since(started) >= target {
			return cost
		}
	}
	return 14
}

func verifyPassword(encoded, password string) bool {
	if !strings.HasPrefix(encoded, "$argon2id$") {
		return bcrypt.CompareHashAndPassword([]byte(encoded), []byte(password)) == nil
	}
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 {
		return false
	}
	var memory uint32
	var iterations uint32
	var parallelism uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism); err != nil {
		return false
	}
	if memory < 8*1024 || memory > 256*1024 || iterations < 1 || iterations > 10 || parallelism < 1 || parallelism > 16 {
		return false
	}
	salt, err1 := base64.RawStdEncoding.DecodeString(parts[4])
	want, err2 := base64.RawStdEncoding.DecodeString(parts[5])
	if err1 != nil || err2 != nil || len(salt) < 8 || len(salt) > 64 || len(want) == 0 || len(want) > 64 {
		return false
	}
	got := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

func passwordNeedsRehash(encoded, algorithm string, bcryptCost int) bool {
	if strings.EqualFold(algorithm, "argon2id") {
		return !strings.HasPrefix(encoded, "$argon2id$")
	}
	if strings.HasPrefix(encoded, "$argon2id$") {
		return false
	}
	cost, err := bcrypt.Cost([]byte(encoded))
	return err != nil || cost != bcryptCost
}

func passwordHistoryContains(history []string, password string) bool {
	for _, oldHash := range history {
		if verifyPassword(oldHash, password) {
			return true
		}
	}
	return false
}
