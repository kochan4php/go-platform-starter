-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS auth.ix_auth_change_log_changed_at;
