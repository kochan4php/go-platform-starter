-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_sessions_metadata_gin ON auth.sessions USING GIN (metadata);
