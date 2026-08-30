-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS audit.ix_event_outbox_payload_gin;
