-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_rbac_change_log_changed_at ON rbac.change_log (changed_at DESC);
