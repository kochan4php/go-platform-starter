SET lock_timeout = '5s';
SET statement_timeout = '5min';

DROP TRIGGER IF EXISTS trg_permissions_change_log ON rbac.permissions;
DROP TRIGGER IF EXISTS trg_roles_change_log ON rbac.roles;
DROP FUNCTION IF EXISTS rbac.capture_row_change();
DROP TABLE IF EXISTS rbac.change_log;
DROP TRIGGER IF EXISTS trg_permissions_updated_at ON rbac.permissions;
DROP TRIGGER IF EXISTS trg_roles_updated_at ON rbac.roles;
DROP FUNCTION IF EXISTS rbac.set_updated_at();

ALTER TABLE rbac.permissions
    DROP CONSTRAINT IF EXISTS ck_permissions_name,
    DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS updated_at;
ALTER TABLE rbac.roles
    DROP CONSTRAINT IF EXISTS ck_roles_color,
    DROP CONSTRAINT IF EXISTS ck_roles_name,
    DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS updated_at;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rbac.roles'::regclass AND conname = 'uq_roles_name') THEN
        ALTER TABLE rbac.roles RENAME CONSTRAINT uq_roles_name TO roles_name_key;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rbac.permissions'::regclass AND conname = 'uq_permissions_name') THEN
        ALTER TABLE rbac.permissions RENAME CONSTRAINT uq_permissions_name TO permissions_name_key;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rbac.role_permissions'::regclass AND conname = 'fk_role_permissions_role') THEN
        ALTER TABLE rbac.role_permissions RENAME CONSTRAINT fk_role_permissions_role TO role_permissions_role_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rbac.role_permissions'::regclass AND conname = 'fk_role_permissions_permission') THEN
        ALTER TABLE rbac.role_permissions RENAME CONSTRAINT fk_role_permissions_permission TO role_permissions_permission_id_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'rbac.user_roles'::regclass AND conname = 'fk_user_roles_role') THEN
        ALTER TABLE rbac.user_roles RENAME CONSTRAINT fk_user_roles_role TO user_roles_role_id_fkey;
    END IF;
END $$;

ALTER SEQUENCE rbac.roles_id_seq CACHE 1;
ALTER SEQUENCE rbac.permissions_id_seq CACHE 1;
