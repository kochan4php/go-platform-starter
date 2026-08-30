-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_email_trgm ON users.users USING GIN (email gin_trgm_ops);
