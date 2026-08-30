-- no-transaction: one concurrent index statement only
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_users_search_document_gin ON users.users USING GIN (search_document);
