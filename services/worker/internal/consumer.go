package internal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"github.com/kochan4php/go-platform-starter/internal/platform"
)

const (
	group      = "workers"
	dlqMax     = 5 // total attempts allowed before the job lands in <stream>:dlq
	attemptTTL = time.Hour
	sentTTL    = 24 * time.Hour
)

var (
	jobsProcessed = prometheus.NewCounterVec(
		prometheus.CounterOpts{Name: "worker_jobs_processed_total"},
		[]string{"stream", "event", "status"})
	streamLag = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{Name: "worker_stream_lag"},
		[]string{"stream"})
	dlqDepth = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{Name: "worker_dlq_depth", Help: "messages waiting in dead-letter streams"},
		[]string{"stream"})
)

func init() { prometheus.MustRegister(jobsProcessed, streamLag, dlqDepth) }

type Consumer struct {
	rdb    *redis.Client
	db     *gorm.DB
	mailer platform.Mailer
	log    *slog.Logger
	stream []string

	minIdle      time.Duration // PEL for XAUTOCLAIM reclaim
	reclaimEvery time.Duration // how often pending entries are reclaimed + lag reported
	concurrency  int
	readCount    int64
	dlqMaxDepth  int64
}

func NewConsumer(rdb *redis.Client, db *gorm.DB, mailer platform.Mailer, log *slog.Logger) *Consumer {
	return &Consumer{
		rdb: rdb, db: db, mailer: mailer,
		log:          log.With("component", "consumer"),
		stream:       []string{"mail.jobs", "audit.events", "webhook.jobs"},
		minIdle:      30 * time.Second,
		reclaimEvery: 10 * time.Second,
		concurrency:  1,
		readCount:    10,
		dlqMaxDepth:  10_000,
	}
}

func (c *Consumer) Configure(concurrency int, readCount int64) *Consumer {
	if concurrency > 0 {
		c.concurrency = concurrency
	}
	if readCount > 0 {
		c.readCount = readCount
	}
	return c
}

func (c *Consumer) ConfigureReliability(minIdle time.Duration, dlqDepth int64) *Consumer {
	if minIdle > 0 {
		c.minIdle = minIdle
	}
	if dlqDepth > 0 {
		c.dlqMaxDepth = dlqDepth
	}
	return c
}

// Run consumes all streams until ctx is done. Groups read from the stream
// beginning ("0") so jobs queued before the worker's first deploy drain on
// boot (PLAN item 49). Failed jobs stay pending and are reclaimed via
// XAUTOCLAIM once minIdle elapses; after dlqMax attempts they land in
// <stream>:dlq (PLAN item 55).
func (c *Consumer) Run(ctx context.Context) {
	c.ensureGroups(ctx)
	var workers sync.WaitGroup
	for range c.concurrency {
		workers.Add(1)
		go func() {
			defer workers.Done()
			c.consume(ctx)
		}()
	}

	ticker := time.NewTicker(c.reclaimEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			workers.Wait()
			return
		case <-ticker.C:
			c.reclaimPending(ctx)
			c.reportLag(ctx)
		}
	}
}

func (c *Consumer) consume(ctx context.Context) {
	for ctx.Err() == nil {
		res, err := c.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    group,
			Consumer: hostnameConsumer(),
			// [stream..., id...] shape: one fresh-delivery marker ">" per stream.
			Streams: append(append([]string{}, c.stream...), freshMarkers(len(c.stream))...),
			Block:   3 * time.Second,
			Count:   c.readCount,
		}).Result()
		switch {
		case err == nil:
			for _, s := range res {
				c.processMessages(ctx, s.Stream, s.Messages)
			}
		case strings.Contains(err.Error(), "NOGROUP"):
			c.ensureGroups(ctx) // stream recreated after a flush/restart
		case errors.Is(err, redis.Nil) || ctx.Err() != nil:
			// idle window elapsed or shutdown — nothing to do
		default:
			c.log.Error("xreadgroup failed", "err", err)
		}
	}
}

func (c *Consumer) ensureGroups(ctx context.Context) {
	for _, s := range c.stream {
		err := c.rdb.XGroupCreateMkStream(ctx, s, group, "0").Err()
		if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
			c.log.Error("create group failed", "stream", s, "err", err)
		}
	}
}

func (c *Consumer) reclaimPending(ctx context.Context) {
	for _, s := range c.stream {
		res, _, err := c.rdb.XAutoClaim(ctx, &redis.XAutoClaimArgs{
			Stream:   s,
			Group:    group,
			Consumer: hostnameConsumer(),
			MinIdle:  c.minIdle,
			Start:    "0-0", // scan the PEL from its beginning
		}).Result()
		if err != nil {
			c.log.Warn("xautoclaim failed", "stream", s, "err", err)
			continue
		}
		c.processMessages(ctx, s, res)
	}
}

func (c *Consumer) reportLag(ctx context.Context) {
	for _, s := range c.stream {
		lenv, err := c.rdb.XLen(ctx, s).Result()
		if err == nil {
			streamLag.WithLabelValues(s).Set(float64(lenv))
		}
		if depth, err := c.rdb.XLen(ctx, s+":dlq").Result(); err == nil {
			dlqDepth.WithLabelValues(s).Set(float64(depth))
		}
	}
}

func (c *Consumer) processMessages(ctx context.Context, stream string, messages []redis.XMessage) {
	acked := make([]string, 0, len(messages))
	process := func(db *gorm.DB) {
		for _, msg := range messages {
			if ctx.Err() != nil {
				return
			}
			event, payload, decodeErr := platform.DecodeStreamMessage(stream, msg.Values)
			if decodeErr != nil {
				event = "invalid:" + decodeErr.Error()
			}
			if c.processWithDB(ctx, db, stream, msg.ID, payload, event) {
				acked = append(acked, msg.ID)
			}
		}
	}
	if stream == "audit.events" {
		if err := c.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error { process(tx); return nil }); err != nil {
			c.log.Warn("audit batch transaction failed", "count", len(messages), "err", err)
			return
		}
	} else {
		process(c.db)
	}
	c.ackBatch(ctx, stream, acked)
}

func (c *Consumer) processWithDB(ctx context.Context, db *gorm.DB, stream, id, payload, event string) bool {
	messageID := stream + ":" + id
	var processed bool
	if err := db.WithContext(ctx).Raw(`SELECT EXISTS (SELECT 1 FROM audit.processed_messages WHERE message_id = ?)`, messageID).Scan(&processed).Error; err == nil && processed {
		return true
	}
	attempts := c.bumpAttempts(ctx, stream, id)
	dedupKey := "worker:sent:" + stream + ":" + id

	var err error
	switch {
	case stream == "mail.jobs" && event == "email.send":
		err = c.handleEmail(ctx, dedupKey, payload)
	case stream == "audit.events":
		err = c.handleAuditWithDB(ctx, db, event, stream+":"+id, payload)
	case stream == "webhook.jobs" && event == "webhook.deliver":
		err = c.handleWebhook(ctx, id, payload)
	default:
		err = fmt.Errorf("no handler for %s/%s", stream, event)
	}

	if err == nil {
		if insertErr := db.WithContext(ctx).Exec(`INSERT INTO audit.processed_messages (message_id) VALUES (?) ON CONFLICT DO NOTHING`, messageID).Error; insertErr != nil {
			err = fmt.Errorf("persist processing checkpoint: %w", insertErr)
		} else {
			jobsProcessed.WithLabelValues(stream, event, "ok").Inc()
			return true
		}
	}

	jobsProcessed.WithLabelValues(stream, event, "failed").Inc()
	c.log.Warn("job failed",
		"stream", stream, "id", id, "attempt", attempts, "err", err)

	if attempts >= dlqMax {
		_ = c.rdb.XAdd(ctx, &redis.XAddArgs{
			Stream: stream + ":dlq",
			MaxLen: c.dlqMaxDepth, Approx: true,
			Values: map[string]any{"event": event, "payload": payload, "orig_id": id},
		}).Err()
		c.log.Error("job moved to DLQ", "stream", stream, "id", id)
		return true
	}
	return false
}

func (c *Consumer) handleWebhook(ctx context.Context, id, payload string) error {
	var job struct {
		URL  string          `json:"url"`
		Body json.RawMessage `json:"body"`
	}
	if err := json.Unmarshal([]byte(payload), &job); err != nil {
		return fmt.Errorf("bad webhook payload: %w", err)
	}
	target, err := url.Parse(job.URL)
	if err != nil || target.Scheme != "https" || !allowedWebhookHost(target.Hostname()) {
		return fmt.Errorf("webhook target is not an allowlisted HTTPS host")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, target.String(), strings.NewReader(string(job.Body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", id)
	response, err := (&http.Client{Timeout: 10 * time.Second}).Do(req)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("webhook returned %d", response.StatusCode)
	}
	return nil
}

func allowedWebhookHost(host string) bool {
	for _, allowed := range strings.Split(os.Getenv("WEBHOOK_ALLOWED_HOSTS"), ",") {
		if strings.EqualFold(strings.TrimSpace(allowed), host) && host != "" {
			return true
		}
	}
	return false
}

func freshMarkers(count int) []string {
	markers := make([]string, count)
	for i := range markers {
		markers[i] = ">"
	}
	return markers
}

func ReplayDLQ(ctx context.Context, rdb *redis.Client, stream string, limit int64) (int, error) {
	if limit <= 0 || limit > 1_000 {
		limit = 100
	}
	dlq := stream + ":dlq"
	messages, err := rdb.XRangeN(ctx, dlq, "-", "+", limit).Result()
	if err != nil {
		return 0, err
	}
	replayed := 0
	for _, message := range messages {
		event := fmt.Sprint(message.Values["event"])
		payload := json.RawMessage(fmt.Sprint(message.Values["payload"]))
		if err := platform.Publish(ctx, rdb, stream, event, payload); err != nil {
			return replayed, err
		}
		if err := rdb.XDel(ctx, dlq, message.ID).Err(); err != nil {
			return replayed, err
		}
		replayed++
	}
	return replayed, nil
}

// handleEmail sends one transactional mail. At-least-once delivery means a
// crash between send and ACK can redeliver; the SETNX marker set only after a
// successful send makes the redelivery a no-op (exactly-once effect).
func (c *Consumer) handleEmail(ctx context.Context, dedupKey, payload string) error {
	set, err := c.rdb.SetNX(ctx, dedupKey, 1, sentTTL).Result()
	if err != nil {
		return fmt.Errorf("dedup check failed: %w", err)
	}
	if !set {
		return nil // already sent by an earlier attempt
	}

	var m struct{ To, Subject, Html string }
	if err := json.Unmarshal([]byte(payload), &m); err != nil {
		return fmt.Errorf("bad email payload: %w", err)
	}
	if _, err := mail.ParseAddress(m.To); err != nil || strings.TrimSpace(m.Subject) == "" || len(m.Subject) > 200 || len(m.Html) > 1<<20 {
		return fmt.Errorf("email payload failed schema validation")
	}
	sendErr := c.mailer.Send(ctx, platform.Mail{To: m.To, Subject: m.Subject, HTML: m.Html})
	if sendErr != nil {
		c.rdb.Del(ctx, dedupKey) // retry must be allowed to try again
	}
	return sendErr
}

// handleAudit flushes one entry into schema `audit`. The worker is the only
// writer of that schema. msg_id carries the originating stream+message ID;
// the unique index turns a redelivery into ON CONFLICT DO NOTHING.
func (c *Consumer) handleAudit(ctx context.Context, event, msgID, payload string) error {
	return c.handleAuditWithDB(ctx, c.db, event, msgID, payload)
}

func (c *Consumer) handleAuditWithDB(ctx context.Context, db *gorm.DB, event, msgID, payload string) error {
	if event != "audit.entry" {
		return nil // unknown audit events are acked-and-ignored
	}
	var ev struct {
		ID       string         `json:"id"`
		ActorSub string         `json:"actorSub"`
		Action   string         `json:"action"`
		Entity   string         `json:"entity"`
		EntityID string         `json:"entityId"`
		Meta     map[string]any `json:"meta"`
	}
	if err := json.Unmarshal([]byte(payload), &ev); err != nil {
		return fmt.Errorf("bad audit payload: %w", err)
	}
	if ev.ID != "" {
		msgID = ev.ID
	}
	if strings.TrimSpace(ev.Action) == "" || len(ev.Action) > 120 || strings.TrimSpace(ev.Entity) == "" || len(ev.Entity) > 120 || len(ev.EntityID) > 255 {
		return fmt.Errorf("audit payload failed schema validation")
	}
	metaJSON, _ := json.Marshal(ev.Meta)
	return db.WithContext(ctx).Exec(
		`INSERT INTO audit.audit_logs (actor_sub, action, entity, entity_id, meta, msg_id)
		 VALUES (?, ?, ?, ?, ?::jsonb, ?)
		 ON CONFLICT (msg_id) DO NOTHING`,
		ev.ActorSub, ev.Action, ev.Entity, ev.EntityID, string(metaJSON), msgID).Error
}

func FlushAuditOutbox(ctx context.Context, db *gorm.DB, rdb *redis.Client) (int, error) {
	var rows []struct{ ID, Stream, Event, Payload string }
	if err := db.WithContext(ctx).Raw(
		`SELECT id, stream, event, payload::text AS payload FROM audit.event_outbox ORDER BY created_at LIMIT 100`,
	).Scan(&rows).Error; err != nil {
		return 0, err
	}
	flushed := 0
	for _, row := range rows {
		if err := platform.Publish(ctx, rdb, row.Stream, row.Event, json.RawMessage(row.Payload)); err != nil {
			return flushed, err
		}
		if err := db.WithContext(ctx).Exec(`DELETE FROM audit.event_outbox WHERE id = ?`, row.ID).Error; err != nil {
			return flushed, err
		}
		flushed++
	}
	return flushed, nil
}

func (c *Consumer) bumpAttempts(ctx context.Context, stream, id string) int64 {
	key := "worker:attempts:" + stream + ":" + id
	n, err := c.rdb.Incr(ctx, key).Result()
	if err != nil {
		return 1
	}
	if n == 1 {
		c.rdb.Expire(ctx, key, attemptTTL)
	}
	if n <= 0 {
		return 1
	}
	return n
}

func (c *Consumer) ackBatch(ctx context.Context, stream string, ids []string) {
	if len(ids) == 0 {
		return
	}
	_, err := c.rdb.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.XAck(ctx, stream, group, ids...)
		keys := make([]string, len(ids))
		for i, id := range ids {
			keys[i] = "worker:attempts:" + stream + ":" + id
		}
		pipe.Del(ctx, keys...)
		return nil
	})
	if err != nil {
		c.log.Warn("ack pipeline failed", "stream", stream, "count", len(ids), "err", err)
	}
}

func hostnameConsumer() string {
	h, err := osHostname()
	if err != nil || h == "" {
		return "worker-" + strconv.Itoa(osPid())
	}
	return h
}
