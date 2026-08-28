ALTER TABLE audit.audit_logs RESET (
    autovacuum_vacuum_scale_factor,
    autovacuum_analyze_scale_factor
);
DROP INDEX IF EXISTS audit.audit_logs_entity_created_idx;
