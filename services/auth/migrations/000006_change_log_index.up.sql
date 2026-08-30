-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_auth_change_log_changed_at ON auth.change_log (changed_at DESC);
