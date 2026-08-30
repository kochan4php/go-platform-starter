SET lock_timeout = '5s';
SET statement_timeout = '5min';

CREATE INDEX IF NOT EXISTS user_roles_role_idx ON rbac.user_roles (role_id, user_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON rbac.role_permissions (permission_id, role_id);
