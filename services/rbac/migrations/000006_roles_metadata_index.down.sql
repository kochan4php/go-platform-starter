-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS rbac.ix_roles_metadata_gin;
