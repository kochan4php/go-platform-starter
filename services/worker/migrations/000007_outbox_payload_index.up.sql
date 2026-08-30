-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_event_outbox_payload_gin ON audit.event_outbox USING GIN (payload);
