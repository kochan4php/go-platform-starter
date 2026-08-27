ALTER TABLE rbac.permissions DROP COLUMN created_at;

ALTER TABLE rbac.roles
    DROP COLUMN archived,
    DROP COLUMN icon,
    DROP COLUMN color;
