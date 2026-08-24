-- 000001_init.up.sql
-- The _template service owns schema `_template`. Copy this file pair when
-- creating a real service and rename the schema to the service name.
CREATE SCHEMA IF NOT EXISTS _template;

CREATE TABLE IF NOT EXISTS _template.ping_log (
    id         BIGSERIAL PRIMARY KEY,
    note       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
