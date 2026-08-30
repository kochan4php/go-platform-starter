SET lock_timeout = '5s';
SET statement_timeout = '5min';

ALTER TABLE audit.event_outbox
    DROP CONSTRAINT IF EXISTS ck_event_outbox_event,
    DROP CONSTRAINT IF EXISTS ck_event_outbox_stream;
ALTER TABLE audit.audit_logs
    DROP CONSTRAINT IF EXISTS ck_audit_logs_entity,
    DROP CONSTRAINT IF EXISTS ck_audit_logs_action,
    ALTER COLUMN meta DROP NOT NULL,
    ALTER COLUMN meta DROP DEFAULT;
ALTER SEQUENCE audit.audit_logs_id_seq CACHE 1;
