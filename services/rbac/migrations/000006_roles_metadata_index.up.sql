-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_roles_metadata_gin ON rbac.roles USING GIN (metadata);
