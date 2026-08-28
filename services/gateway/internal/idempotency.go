package internal

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/redis/go-redis/v9"
)

type idempotencyRecord struct {
	Fingerprint string      `json:"fingerprint"`
	Status      int         `json:"status"`
	Header      http.Header `json:"header"`
	Body        []byte      `json:"body"`
}

type bufferedWriter struct {
	header http.Header
	status int
	body   []byte
}

func (w *bufferedWriter) Header() http.Header { return w.header }
func (w *bufferedWriter) WriteHeader(status int) {
	if w.status == 0 {
		w.status = status
	}
}
func (w *bufferedWriter) Write(body []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	w.body = append(w.body, body...)
	return len(body), nil
}

func serveIdempotent(w http.ResponseWriter, r *http.Request, rdb *redis.Client, subject string, serve func(http.ResponseWriter)) {
	key := r.Header.Get("Idempotency-Key")
	if key == "" {
		serve(w)
		return
	}
	if len(key) > 128 {
		platform.Fail(w, http.StatusBadRequest, "invalid_idempotency_key", "Idempotency-Key must not exceed 128 characters")
		return
	}
	hash := sha256.Sum256([]byte(subject + "\n" + r.Method + "\n" + r.URL.Path + "\n" + key))
	redisKey := fmt.Sprintf("idempotency:%x", hash[:])
	fingerprint, err := requestFingerprint(r)
	if err != nil {
		platform.Fail(w, http.StatusBadRequest, "invalid_request", "could not read request body")
		return
	}
	locked, err := rdb.SetNX(r.Context(), redisKey, []byte("processing:"+fingerprint), 24*time.Hour).Result()
	if err != nil {
		serve(w)
		return
	}
	if !locked {
		raw, getErr := rdb.Get(r.Context(), redisKey).Bytes()
		var record idempotencyRecord
		if getErr == nil && json.Unmarshal(raw, &record) == nil {
			if record.Fingerprint != fingerprint {
				platform.Fail(w, http.StatusConflict, "idempotency_mismatch", "Idempotency-Key was already used with a different request body")
				return
			}
			copyHeader(w.Header(), record.Header)
			w.Header().Set("Idempotency-Replayed", "true")
			w.WriteHeader(record.Status)
			_, _ = w.Write(record.Body)
			return
		}
		platform.Fail(w, http.StatusConflict, "request_in_progress", "a request with this Idempotency-Key is still running")
		return
	}

	buffer := &bufferedWriter{header: make(http.Header)}
	serve(buffer)
	if buffer.status == 0 {
		buffer.status = http.StatusOK
	}
	if buffer.status < 500 && len(buffer.body) <= 1<<20 {
		record, _ := json.Marshal(idempotencyRecord{fingerprint, buffer.status, buffer.header, buffer.body})
		_ = rdb.Set(context.WithoutCancel(r.Context()), redisKey, record, 24*time.Hour).Err()
	} else {
		_ = rdb.Del(context.WithoutCancel(r.Context()), redisKey).Err()
	}
	copyHeader(w.Header(), buffer.header)
	w.WriteHeader(buffer.status)
	_, _ = w.Write(buffer.body)
}

func requestFingerprint(r *http.Request) (string, error) {
	if r.Body == nil {
		return fmt.Sprintf("%x", sha256.Sum256(nil)), nil
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20+1))
	if err != nil {
		return "", err
	}
	r.Body = io.NopCloser(strings.NewReader(string(body)))
	if len(body) > 1<<20 {
		return "", fmt.Errorf("request body too large")
	}
	return fmt.Sprintf("%x", sha256.Sum256(body)), nil
}

func copyHeader(dst, src http.Header) {
	for key, values := range src {
		dst[key] = append([]string(nil), values...)
	}
}
