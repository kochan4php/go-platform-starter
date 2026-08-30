-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS users.ix_users_search_document_gin;
