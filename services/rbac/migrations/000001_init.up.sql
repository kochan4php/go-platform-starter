CREATE SCHEMA IF NOT EXISTS rbac;

CREATE TABLE IF NOT EXISTS rbac.roles (
    id          UUID        PRIMARY KEY,
    name        TEXT        NOT NULL UNIQUE,
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rbac.permissions (
    id   BIGSERIAL PRIMARY KEY,
    name TEXT      NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS rbac.role_permissions (
    role_id       UUID   NOT NULL,
    permission_id BIGINT NOT NULL REFERENCES rbac.permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS rbac.user_roles (
    user_sub UUID PRIMARY KEY,
    role_id  UUID   NOT NULL REFERENCES rbac.roles (id) ON DELETE CASCADE,
    ver      BIGINT NOT NULL DEFAULT 0
);
