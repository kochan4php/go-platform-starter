ALTER TABLE audit.event_outbox
    DROP COLUMN IF EXISTS baggage,
    DROP COLUMN IF EXISTS tracestate,
    DROP COLUMN IF EXISTS traceparent;
