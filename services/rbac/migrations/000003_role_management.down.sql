SET lock_timeout = '5s';
SET statement_timeout = '5min';

ALTER TABLE rbac.permissions DROP COLUMN IF EXISTS created_at;

ALTER TABLE rbac.roles
    DROP COLUMN IF EXISTS archived,
    DROP COLUMN IF EXISTS icon,
    DROP COLUMN IF EXISTS color;
