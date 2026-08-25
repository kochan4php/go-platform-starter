package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"github.com/kochan4php/go-platform-starter/internal/platform"
	"github.com/kochan4php/go-platform-starter/internal/testutil"
)

type recordingMailer struct {
	sent []platform.Mail
	fail func() bool
}

func (m *recordingMailer) Send(_ context.Context, mail platform.Mail) error {
	if m.fail != nil && m.fail() {
		return fmt.Errorf("transient smtp failure")
	}
	m.sent = append(m.sent, mail)
	return nil
}

func publish(ctx context.Context, rdb *redis.Client, stream, event string, payload any) error {
	raw, _ := json.Marshal(payload)
	return rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: stream,
		Values: map[string]any{"event": event, "payload": string(raw)},
	}).Err()
}

type fixture struct {
	rdb    *redis.Client
	db     *gorm.DB
	mailer *recordingMailer
	c      *Consumer
}

func startFixture(t *testing.T, mailer *recordingMailer) *fixture {
	t.Helper()
	dsn := testutil.StartPostgres(t)
	addr := testutil.StartRedis(t)

	if err := retryUntil(func() error { return MigrateUp(dsn) }, 20*time.Second); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	db := openDB(t, dsn)
	t.Cleanup(func() { closeDB(t, db) })

	rdb := redis.NewClient(&redis.Options{Addr: addr})
	t.Cleanup(func() { _ = rdb.Close() })

	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	if mailer == nil {
		mailer = &recordingMailer{}
	}
	c := NewConsumer(rdb, db, mailer, log)
	c.minIdle = 150 * time.Millisecond
	c.reclaimEvery = 250 * time.Millisecond
	return &fixture{rdb: rdb, db: db, mailer: mailer, c: c}
}

func (f *fixture) start(t *testing.T) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	go f.c.Run(ctx)
	t.Cleanup(cancel)
}

func waitFor(t *testing.T, timeout time.Duration, cond func() bool, msg string) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal(msg)
}

// Postgres containers report ready before they accept every connection
// reliably; the first open can transiently EOF (same pattern as auth's suite).
func retryUntil(fn func() error, within time.Duration) error {
	deadline := time.Now().Add(within)
	for {
		err := fn()
		if err == nil {
			return nil
		}
		if time.Now().After(deadline) {
			return err
		}
		time.Sleep(500 * time.Millisecond)
	}
}

func TestEmailJobDeliveredAndAuditFlushed(t *testing.T) {
	f := startFixture(t, nil)
	f.start(t)

	if err := publish(context.Background(), f.rdb, "mail.jobs", "email.send",
		map[string]string{"to": "a@b.c", "subject": "Hi", "html": "<b>hi</b>"}); err != nil {
		t.Fatal(err)
	}
	if err := publish(context.Background(), f.rdb, "audit.events", "audit.entry",
		map[string]any{"actorSub": platform.BootstrapSub, "action": "create", "entity": "role"}); err != nil {
		t.Fatal(err)
	}

	waitFor(t, 15*time.Second, func() bool { return len(f.mailer.sent) == 1 },
		"email not delivered")
	if f.mailer.sent[0].To != "a@b.c" {
		t.Fatalf("wrong recipient: %+v", f.mailer.sent)
	}

	var count int64
	waitFor(t, 15*time.Second, func() bool {
		f.db.Table("audit.audit_logs").Count(&count)
		return count >= 1
	}, "audit row never flushed")
}

// Chaos drill (PLAN item 55): kill the worker mid-batch — deliveries stay
// pending un-acked — and prove redelivery lands exactly-once.
func TestCrashMidBatchRedeliversExactlyOnce(t *testing.T) {
	f := startFixture(t, nil)
	ctx := context.Background()

	// Worker A claims the job then "crashes": read-group without ack. The
	// group exists because a live worker would have created it on boot.
	if err := f.rdb.XGroupCreateMkStream(ctx, "mail.jobs", group, "0").Err(); err != nil {
		t.Fatal(err)
	}
	if err := publish(ctx, f.rdb, "mail.jobs", "email.send",
		map[string]string{"to": "a@b.c", "subject": "once", "html": "<p/>"}); err != nil {
		t.Fatal(err)
	}
	if _, err := f.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group: group, Consumer: "crashed-worker-a",
		Streams: []string{"mail.jobs", ">"},
	}).Result(); err != nil {
		t.Fatalf("simulate crash claim: %v", err)
	}

	// Worker B boots and reclaims the orphaned delivery.
	f.start(t)

	waitFor(t, 15*time.Second, func() bool { return len(f.mailer.sent) >= 1 },
		"orphaned delivery never redelivered")

	// Let reclaim run many more cycles: the dedup marker must suppress
	// duplicate sends (exactly-once effect on an at-least-once channel).
	time.Sleep(10 * f.c.reclaimEvery)
	if len(f.mailer.sent) != 1 {
		t.Fatalf("duplicate sends after redelivery: %d", len(f.mailer.sent))
	}
	pending, _ := f.rdb.XPending(ctx, "mail.jobs", group).Result()
	if pending.Count != 0 {
		t.Fatalf("message never acked: %d pending", pending.Count)
	}
}

func TestFailingJobRedeliversThenGoesToDLQOnlyAfterMaxAttempts(t *testing.T) {
	attempts := 0
	mailer := &recordingMailer{fail: func() bool {
		attempts++
		return attempts <= dlqMax-1 // fail three times, succeed on the last allowed attempt
	}}
	f := startFixture(t, mailer)
	f.start(t)

	if err := publish(context.Background(), f.rdb, "mail.jobs", "email.send",
		map[string]string{"to": "x@y.z", "subject": "retry me", "html": "<p/>"}); err != nil {
		t.Fatal(err)
	}

	waitFor(t, 30*time.Second, func() bool { return len(mailer.sent) == 1 },
		fmt.Sprintf("redelivery did not succeed; sent=%d attempts=%d", len(mailer.sent), attempts))
	dlqLen, _ := f.rdb.XLen(context.Background(), "mail.jobs:dlq").Result()
	if dlqLen != 0 {
		t.Fatalf("eventual success must not land in DLQ, dlq=%d", dlqLen)
	}

	// Now a permanently-broken job must land in the DLQ after dlqMax attempts.
	bad := &recordingMailer{fail: func() bool { return true }}
	f2 := startFixture(t, bad)
	f2.start(t)
	if err := publish(context.Background(), f2.rdb, "mail.jobs", "email.send",
		map[string]string{"to": "z@z.z", "subject": "poison", "html": "<p/>"}); err != nil {
		t.Fatal(err)
	}
	waitFor(t, 60*time.Second, func() bool {
		n, _ := f2.rdb.XLen(context.Background(), "mail.jobs:dlq").Result()
		return n == 1
	}, "poison job never reached the DLQ")
}

func TestAuditFlushIsIdempotentPerMessageID(t *testing.T) {
	f := startFixture(t, nil)
	c := &Consumer{db: f.db, log: slog.New(slog.NewTextHandler(io.Discard, nil))}

	payload := `{"actorSub":"u1","action":"create","entity":"role","entityId":"r1"}`
	for i := 0; i < 3; i++ {
		if err := c.handleAudit(context.Background(), "audit.entry", "audit.events:42-0", payload); err != nil {
			t.Fatalf("flush %d: %v", i, err)
		}
	}
	var count int64
	f.db.Table("audit.audit_logs").Count(&count)
	if count != 1 {
		t.Fatalf("redelivery duplicated audit row: %d", count)
	}
}

func openDB(t *testing.T, dsn string) (out *gorm.DB) {
	t.Helper()
	var db *gorm.DB
	var err error
	deadline := time.Now().Add(20 * time.Second)
	for {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: newSilentGormLogger(),
		})
		if err == nil {
			return db
		}
		if time.Now().After(deadline) {
			t.Fatalf("connect: %v", err)
		}
		time.Sleep(500 * time.Millisecond)
	}
}

func closeDB(t *testing.T, db *gorm.DB) {
	sqlDB, err := db.DB()
	if err != nil {
		return
	}
	_ = sqlDB.Close()
}

func newSilentGormLogger() gormlogger.Interface {
	return platform.NewGormLogger(slog.New(slog.NewTextHandler(io.Discard, nil)), time.Minute)
}
