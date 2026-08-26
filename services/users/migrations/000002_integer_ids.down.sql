CREATE TABLE users.profiles (
    id           UUID        PRIMARY KEY,
    display_name TEXT        NOT NULL DEFAULT '',
    avatar_url   TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
