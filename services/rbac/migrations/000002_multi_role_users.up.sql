ALTER TABLE rbac.user_roles DROP CONSTRAINT user_roles_pkey;
ALTER TABLE rbac.user_roles ADD PRIMARY KEY (user_id, role_id);

CREATE TABLE rbac.user_versions (
    user_id BIGINT PRIMARY KEY,
    ver     BIGINT NOT NULL DEFAULT 0
);

INSERT INTO rbac.user_versions (user_id, ver)
SELECT user_id, MAX(ver) FROM rbac.user_roles GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;
