-- rollback: services/worker/migrations/000005_data_governance.down.sql
SET lock_timeout = '5s';
SET statement_timeout = '5min';

ALTER TABLE audit.audit_logs
    ALTER COLUMN meta SET DEFAULT '{}'::jsonb,
    ALTER COLUMN meta SET NOT NULL,
    ADD CONSTRAINT ck_audit_logs_action CHECK (length(btrim(action)) > 0),
    ADD CONSTRAINT ck_audit_logs_entity CHECK (length(btrim(entity)) > 0);

ALTER TABLE audit.event_outbox
    ADD CONSTRAINT ck_event_outbox_stream CHECK (length(btrim(stream)) > 0),
    ADD CONSTRAINT ck_event_outbox_event CHECK (length(btrim(event)) > 0);

ALTER SEQUENCE audit.audit_logs_id_seq CACHE 64;

COMMENT ON TABLE audit.audit_logs IS 'Append-only application audit event ledger.';
COMMENT ON COLUMN audit.audit_logs.id IS 'Database sequence for chronological retrieval.';
COMMENT ON COLUMN audit.audit_logs.actor_sub IS 'Actor subject id, or empty for system activity.';
COMMENT ON COLUMN audit.audit_logs.action IS 'Stable action name.';
COMMENT ON COLUMN audit.audit_logs.entity IS 'Stable entity type.';
COMMENT ON COLUMN audit.audit_logs.entity_id IS 'Logical entity identifier.';
COMMENT ON COLUMN audit.audit_logs.meta IS 'Structured non-secret audit context.';
COMMENT ON COLUMN audit.audit_logs.msg_id IS 'Idempotency key for stream redelivery.';
COMMENT ON COLUMN audit.audit_logs.created_at IS 'Database-assigned event timestamp.';
COMMENT ON TABLE audit.processed_messages IS 'Durable inbox deduplication ledger.';
COMMENT ON COLUMN audit.processed_messages.message_id IS 'Globally stable stream message id.';
COMMENT ON COLUMN audit.processed_messages.processed_at IS 'Time the message completed successfully.';
COMMENT ON TABLE audit.event_outbox IS 'Transactional event outbox awaiting Redis Stream publication.';
COMMENT ON COLUMN audit.event_outbox.id IS 'Globally stable outbox event id.';
COMMENT ON COLUMN audit.event_outbox.stream IS 'Destination Redis Stream.';
COMMENT ON COLUMN audit.event_outbox.event IS 'Versioned event type.';
COMMENT ON COLUMN audit.event_outbox.payload IS 'Versioned event payload; secrets are prohibited.';
COMMENT ON COLUMN audit.event_outbox.created_at IS 'Database-assigned enqueue timestamp.';
COMMENT ON COLUMN audit.event_outbox.traceparent IS 'W3C traceparent propagated with the event.';
COMMENT ON COLUMN audit.event_outbox.tracestate IS 'W3C tracestate propagated with the event.';
COMMENT ON COLUMN audit.event_outbox.baggage IS 'W3C baggage propagated with the event.';
