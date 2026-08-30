-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS rbac.ix_rbac_change_log_changed_at;
