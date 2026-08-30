SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP TABLE IF EXISTS audit.event_outbox;
DROP TABLE IF EXISTS audit.processed_messages;
