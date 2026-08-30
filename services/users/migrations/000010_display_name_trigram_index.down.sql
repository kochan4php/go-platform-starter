-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS users.ix_users_display_name_trgm;
