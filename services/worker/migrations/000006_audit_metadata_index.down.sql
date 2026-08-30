-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS audit.ix_audit_logs_meta_gin;
