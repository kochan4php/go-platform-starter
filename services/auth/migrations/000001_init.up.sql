-- 000001_init.up.sql
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id                     UUID        PRIMARY KEY,
    email                  TEXT        NOT NULL,
    password_hash          TEXT        NOT NULL,
    status                 TEXT        NOT NULL DEFAULT 'active',
    failed_login_attempts  INT         NOT NULL DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON auth.users (lower(email));

CREATE TABLE IF NOT EXISTS auth.sessions (
    id                 UUID        PRIMARY KEY,
    user_id            UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    refresh_token_hash TEXT        NOT NULL UNIQUE,
    family_id          UUID        NOT NULL,
    user_agent         TEXT        NOT NULL DEFAULT '',
    ip                 TEXT        NOT NULL DEFAULT '',
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON auth.sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_family_idx ON auth.sessions (family_id);
