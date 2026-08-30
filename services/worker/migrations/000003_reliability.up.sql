SET lock_timeout = '5s';
SET statement_timeout = '5min';

CREATE TABLE IF NOT EXISTS audit.processed_messages (
    message_id text PRIMARY KEY,
    processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit.processed_messages SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);

CREATE TABLE IF NOT EXISTS audit.event_outbox (
    id text PRIMARY KEY,
    stream text NOT NULL,
    event text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_outbox_created_idx ON audit.event_outbox (created_at);
