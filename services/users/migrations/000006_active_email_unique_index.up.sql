-- no-transaction: one concurrent index statement only
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_users_email_active ON users.users (lower(email)) WHERE deleted_at IS NULL;
