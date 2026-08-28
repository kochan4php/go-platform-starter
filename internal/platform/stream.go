package platform

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

// Publish writes a domain event to a Redis Stream. Payloads are JSON-encoded
// once here; consumers own their decoding. Streams used by the platform:
//
//	users.events  — user.created / user.deleted (see docs/CONTRACTS.md)
//	mail.jobs     — email.send jobs consumed by the worker
//	audit.events  — audit trail entries flushed by the worker
func Publish(ctx context.Context, rdb *redis.Client, stream, event string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	payloadText := string(raw)
	values := map[string]any{"event": event}
	if keyRing := strings.TrimSpace(os.Getenv("STREAM_ENCRYPTION_KEYS")); keyRing != "" {
		payloadText, err = EncryptForSubject(ActiveSecret(keyRing), stream, event, payloadText)
		if err != nil {
			return err
		}
		values["encrypted"] = "1"
	}
	values["payload"] = payloadText
	if keyRing := strings.TrimSpace(os.Getenv("STREAM_SIGNING_KEYS")); keyRing != "" {
		values["signature"] = KeyedDigest(ActiveSecret(keyRing), stream+"\n"+event+"\n"+payloadText)
	}
	return rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: values,
	}).Err()
}

// DecodeStreamMessage verifies producer authenticity before optionally
// decrypting a payload. Key rings accept active,previous values for rotation.
func DecodeStreamMessage(stream string, values map[string]any) (string, string, error) {
	eventValue, hasEvent := values["event"]
	payloadValue, hasPayload := values["payload"]
	event := fmt.Sprint(eventValue)
	payload := fmt.Sprint(payloadValue)
	if !hasEvent || !hasPayload || eventValue == nil || payloadValue == nil || event == "" || payload == "" {
		return "", "", fmt.Errorf("stream message is missing event or payload")
	}
	if keyRing := strings.TrimSpace(os.Getenv("STREAM_SIGNING_KEYS")); keyRing != "" {
		signature := fmt.Sprint(values["signature"])
		if !VerifyDigest(keyRing, stream+"\n"+event+"\n"+payload, signature) {
			return "", "", fmt.Errorf("invalid stream signature")
		}
	}
	if fmt.Sprint(values["encrypted"]) == "1" {
		keyRing := strings.TrimSpace(os.Getenv("STREAM_ENCRYPTION_KEYS"))
		if keyRing == "" {
			return "", "", fmt.Errorf("encrypted stream payload has no configured key")
		}
		plain, err := DecryptForSubject(keyRing, stream, event, payload)
		if err != nil {
			return "", "", err
		}
		payload = plain
	}
	return event, payload, nil
}
