-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_display_name_trgm ON users.users USING GIN (display_name gin_trgm_ops);
