SET lock_timeout = '5s';
SET statement_timeout = '5min';

ALTER TABLE rbac.roles
    ADD COLUMN color TEXT NOT NULL DEFAULT '#6366f1',
    ADD COLUMN icon TEXT NOT NULL DEFAULT 'shield',
    ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE rbac.permissions
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
