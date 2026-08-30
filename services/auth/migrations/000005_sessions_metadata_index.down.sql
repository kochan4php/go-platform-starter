-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS auth.ix_sessions_metadata_gin;
