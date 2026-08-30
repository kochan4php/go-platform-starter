SET lock_timeout = '5s';
SET statement_timeout = '5min';

ALTER TABLE audit.event_outbox
    DROP COLUMN IF EXISTS baggage,
    DROP COLUMN IF EXISTS tracestate,
    DROP COLUMN IF EXISTS traceparent;
