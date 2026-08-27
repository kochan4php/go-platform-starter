DELETE FROM rbac.user_roles a
USING rbac.user_roles b
WHERE a.user_id = b.user_id AND a.role_id > b.role_id;

DROP TABLE rbac.user_versions;

ALTER TABLE rbac.user_roles DROP CONSTRAINT user_roles_pkey;
ALTER TABLE rbac.user_roles ADD PRIMARY KEY (user_id);
