ALTER TABLE audit.event_outbox
    ADD COLUMN IF NOT EXISTS traceparent text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS tracestate text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS baggage text NOT NULL DEFAULT '';
