-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS rbac.ix_permissions_metadata_gin;
