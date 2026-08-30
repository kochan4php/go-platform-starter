-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_metadata_gin ON users.users USING GIN (metadata);
