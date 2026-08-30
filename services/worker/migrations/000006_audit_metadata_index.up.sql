-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_audit_logs_meta_gin ON audit.audit_logs USING GIN (meta);
