SET lock_timeout = '5s';
SET statement_timeout = '5min';

DELETE FROM rbac.user_roles a
USING rbac.user_roles b
WHERE a.user_id = b.user_id AND a.role_id > b.role_id;

DROP TABLE IF EXISTS rbac.user_versions;

ALTER TABLE rbac.user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE rbac.user_roles ADD PRIMARY KEY (user_id);
