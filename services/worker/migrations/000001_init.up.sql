CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id         BIGSERIAL   PRIMARY KEY,
    actor_sub  TEXT        NOT NULL DEFAULT '',
    action     TEXT        NOT NULL,
    entity     TEXT        NOT NULL,
    entity_id  TEXT        NOT NULL DEFAULT '',
    meta       JSONB,
    msg_id     TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Redelivery dedup: msg_id = "<stream>:<redis message id>" (PLAN item 55).
CREATE UNIQUE INDEX IF NOT EXISTS audit_logs_msg_id_idx ON audit.audit_logs (msg_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit.audit_logs (created_at DESC);
