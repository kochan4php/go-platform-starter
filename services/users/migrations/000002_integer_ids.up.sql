-- 000002_integer_ids: profiles.id follows auth.users.id (now BIGINT).
-- Pre-release breaking reset; rows re-materialize from user.created events
-- (consumer groups read from stream start) or via the admin create flow.
DROP TABLE IF EXISTS users.profiles CASCADE;

CREATE TABLE users.profiles (
    id           BIGINT      PRIMARY KEY,
    display_name TEXT        NOT NULL DEFAULT '',
    avatar_url   TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
