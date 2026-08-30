SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP INDEX IF EXISTS rbac.role_permissions_permission_idx;
DROP INDEX IF EXISTS rbac.user_roles_role_idx;
