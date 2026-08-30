-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_permissions_metadata_gin ON rbac.permissions USING GIN (metadata);
