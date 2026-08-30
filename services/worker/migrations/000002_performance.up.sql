SET lock_timeout = '5s';
SET statement_timeout = '5min';

CREATE INDEX audit_logs_entity_created_idx
    ON audit.audit_logs (entity, entity_id, created_at DESC);

ALTER TABLE audit.audit_logs SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);
