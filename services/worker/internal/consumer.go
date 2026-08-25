package internal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
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
)

func init() { prometheus.MustRegister(jobsProcessed, streamLag) }

type Consumer struct {
	rdb    *redis.Client
	db     *gorm.DB
	mailer platform.Mailer
	log    *slog.Logger
	stream []string

	minIdle      time.Duration // PEL for XAUTOCLAIM reclaim
	reclaimEvery time.Duration // how often pending entries are reclaimed + lag reported
}

func NewConsumer(rdb *redis.Client, db *gorm.DB, mailer platform.Mailer, log *slog.Logger) *Consumer {
	return &Consumer{
		rdb: rdb, db: db, mailer: mailer,
		log:          log.With("component", "consumer"),
		stream:       []string{"mail.jobs", "audit.events"},
		minIdle:      30 * time.Second,
		reclaimEvery: 10 * time.Second,
	}
}

// Run consumes all streams until ctx is done. Groups read from the stream
// beginning ("0") so jobs queued before the worker's first deploy drain on
// boot (PLAN item 49). Failed jobs stay pending and are reclaimed via
// XAUTOCLAIM once minIdle elapses; after dlqMax attempts they land in
// <stream>:dlq (PLAN item 55).
func (c *Consumer) Run(ctx context.Context) {
	c.ensureGroups(ctx)

	ticker := time.NewTicker(c.reclaimEvery)
	defer ticker.Stop()

	for ctx.Err() == nil {
		res, err := c.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    group,
			Consumer: hostnameConsumer(),
			// [stream..., id...] shape: one fresh-delivery marker ">" per stream.
			Streams: append(append([]string{}, c.stream...), ">", ">"),
			Block:   3 * time.Second,
			Count:   10,
		}).Result()
		switch {
		case err == nil:
			for _, s := range res {
				for _, msg := range s.Messages {
					c.process(ctx, s.Stream, msg.ID, str(msg.Values["payload"]), str(msg.Values["event"]))
				}
			}
		case strings.Contains(err.Error(), "NOGROUP"):
			c.ensureGroups(ctx) // stream recreated after a flush/restart
		case errors.Is(err, redis.Nil) || ctx.Err() != nil:
			// idle window elapsed or shutdown — nothing to do
		default:
			c.log.Error("xreadgroup failed", "err", err)
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.reclaimPending(ctx)
			c.reportLag(ctx)
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
		for _, msg := range res {
			c.process(ctx, s, msg.ID, str(msg.Values["payload"]), str(msg.Values["event"]))
		}
	}
}

func (c *Consumer) reportLag(ctx context.Context) {
	for _, s := range c.stream {
		lenv, err := c.rdb.XLen(ctx, s).Result()
		if err == nil {
			streamLag.WithLabelValues(s).Set(float64(lenv))
		}
	}
}

func (c *Consumer) process(ctx context.Context, stream, id, payload, event string) {
	attempts := c.bumpAttempts(ctx, stream, id)
	dedupKey := "worker:sent:" + stream + ":" + id

	var err error
	switch {
	case stream == "mail.jobs" && event == "email.send":
		err = c.handleEmail(ctx, dedupKey, payload)
	case stream == "audit.events":
		err = c.handleAudit(ctx, event, stream+":"+id, payload)
	default:
		err = fmt.Errorf("no handler for %s/%s", stream, event)
	}

	if err == nil {
		jobsProcessed.WithLabelValues(stream, event, "ok").Inc()
		c.ack(ctx, stream, id)
		return
	}

	jobsProcessed.WithLabelValues(stream, event, "failed").Inc()
	c.log.Warn("job failed",
		"stream", stream, "id", id, "attempt", attempts, "err", err)

	if attempts >= dlqMax {
		_ = c.rdb.XAdd(ctx, &redis.XAddArgs{
			Stream: stream + ":dlq",
			Values: map[string]any{"event": event, "payload": payload, "orig_id": id},
		}).Err()
		c.ack(ctx, stream, id)
		c.log.Error("job moved to DLQ", "stream", stream, "id", id)
	}
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
	if event != "audit.entry" {
		return nil // unknown audit events are acked-and-ignored
	}
	var ev struct {
		ActorSub string         `json:"actorSub"`
		Action   string         `json:"action"`
		Entity   string         `json:"entity"`
		EntityID string         `json:"entityId"`
		Meta     map[string]any `json:"meta"`
	}
	if err := json.Unmarshal([]byte(payload), &ev); err != nil {
		return fmt.Errorf("bad audit payload: %w", err)
	}
	metaJSON, _ := json.Marshal(ev.Meta)
	return c.db.WithContext(ctx).Exec(
		`INSERT INTO audit.audit_logs (actor_sub, action, entity, entity_id, meta, msg_id)
		 VALUES (?, ?, ?, ?, ?::jsonb, ?)
		 ON CONFLICT (msg_id) DO NOTHING`,
		ev.ActorSub, ev.Action, ev.Entity, ev.EntityID, string(metaJSON), msgID).Error
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

func (c *Consumer) ack(ctx context.Context, stream, id string) {
	c.rdb.XAck(ctx, stream, group, id)
	c.rdb.Del(ctx, "worker:attempts:"+stream+":"+id)
}

func hostnameConsumer() string {
	h, err := osHostname()
	if err != nil || h == "" {
		return "worker-" + strconv.Itoa(osPid())
	}
	return h
}
