package platform

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"strings"

	"golang.org/x/crypto/hkdf"
)

// DeriveKey isolates cryptographic uses and users even when they share one
// deployment master key. Rotate master keys with the active,previous convention.
func DeriveKey(master, subject, purpose string) ([]byte, error) {
	if strings.TrimSpace(master) == "" {
		return nil, fmt.Errorf("master key is required")
	}
	key := make([]byte, 32)
	if _, err := io.ReadFull(hkdf.New(sha256.New, []byte(master), []byte(subject), []byte(purpose)), key); err != nil {
		return nil, err
	}
	return key, nil
}

func EncryptForSubject(master, subject, purpose, plaintext string) (string, error) {
	key, err := DeriveKey(master, subject, purpose)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	sealed := aead.Seal(nonce, nonce, []byte(plaintext), []byte(subject+":"+purpose))
	return base64.RawURLEncoding.EncodeToString(sealed), nil
}

func DecryptForSubject(keyRing, subject, purpose, encoded string) (string, error) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}
	for _, master := range strings.Split(keyRing, ",") {
		key, derr := DeriveKey(strings.TrimSpace(master), subject, purpose)
		if derr != nil {
			continue
		}
		block, derr := aes.NewCipher(key)
		if derr != nil {
			continue
		}
		aead, derr := cipher.NewGCM(block)
		if derr != nil || len(raw) < aead.NonceSize() {
			continue
		}
		plain, derr := aead.Open(nil, raw[:aead.NonceSize()], raw[aead.NonceSize():], []byte(subject+":"+purpose))
		if derr == nil {
			return string(plain), nil
		}
	}
	return "", fmt.Errorf("decrypt ciphertext")
}

func KeyedDigest(secret, value string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func VerifyDigest(keyRing, value, want string) bool {
	matched := false
	for _, key := range strings.Split(keyRing, ",") {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		got := KeyedDigest(key, value)
		matched = hmac.Equal([]byte(got), []byte(want)) || matched
	}
	return matched
}
