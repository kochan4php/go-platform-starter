-- no-transaction: one concurrent index statement only
DROP INDEX CONCURRENTLY IF EXISTS users.uq_users_email_active;
