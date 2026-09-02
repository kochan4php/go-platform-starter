# Schema registry and data dictionary

> Generated from PostgreSQL `information_schema`/`pg_catalog` by `go run ./cmd/dbdocs`. Do not edit manually.

## `audit.audit_logs`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | nextval('audit.audit_logs_id_seq'::regclass) | Database sequence for chronological retrieval. |
| `actor_sub` | `text` | no | ''::text | Actor subject id, or empty for system activity. |
| `action` | `text` | no | — | Stable action name. |
| `entity` | `text` | no | — | Stable entity type. |
| `entity_id` | `text` | no | ''::text | Logical entity identifier. |
| `meta` | `jsonb` | no | '{}'::jsonb | Structured non-secret audit context. |
| `msg_id` | `text` | no | ''::text | Idempotency key for stream redelivery. |
| `created_at` | `timestamp with time zone` | no | now() | Database-assigned event timestamp. |

## `audit.event_outbox`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `text` | no | — | Globally stable outbox event id. |
| `stream` | `text` | no | — | Destination Redis Stream. |
| `event` | `text` | no | — | Versioned event type. |
| `payload` | `jsonb` | no | — | Versioned event payload; secrets are prohibited. |
| `created_at` | `timestamp with time zone` | no | now() | Database-assigned enqueue timestamp. |
| `traceparent` | `text` | no | ''::text | W3C traceparent propagated with the event. |
| `tracestate` | `text` | no | ''::text | W3C tracestate propagated with the event. |
| `baggage` | `text` | no | ''::text | W3C baggage propagated with the event. |

## `audit.processed_messages`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `message_id` | `text` | no | — | Globally stable stream message id. |
| `processed_at` | `timestamp with time zone` | no | now() | Time the message completed successfully. |

## `auth.change_log`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | IDENTITY | Database-generated audit sequence. |
| `table_name` | `text` | no | — | Changed table within the auth schema. |
| `operation` | `text` | no | — | INSERT, UPDATE, or DELETE. |
| `row_id` | `text` | no | ''::text | Text representation of the changed primary key. |
| `old_data` | `jsonb` | yes | — | Pre-change JSON with credential material removed. |
| `new_data` | `jsonb` | yes | — | Post-change JSON with credential material removed. |
| `changed_at` | `timestamp with time zone` | no | now() | Database timestamp of the mutation. |
| `changed_by` | `bigint` | yes | — | Optional logical user id responsible for the mutation. |

## `auth.sessions`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | IDENTITY | Database-generated session identifier. |
| `user_id` | `bigint` | no | — | Logical users.users.id reference; intentionally no cross-service foreign key. |
| `refresh_token_hash` | `text` | no | — | One-way refresh-token digest; never emitted by audit triggers. |
| `family_id` | `text` | no | — | Refresh-token rotation family identifier. |
| `user_agent` | `text` | no | ''::text | Last observed client user-agent string. |
| `ip` | `text` | no | ''::text | Last observed client IP text representation. |
| `expires_at` | `timestamp with time zone` | no | — | Absolute refresh-session expiry. |
| `revoked_at` | `timestamp with time zone` | yes | — | Revocation timestamp; null while active. |
| `created_at` | `timestamp with time zone` | no | now() | Database-assigned session creation timestamp. |
| `device_id` | `text` | no | ''::text | Stable client-generated device identifier when available. |
| `metadata` | `jsonb` | no | '{}'::jsonb | Non-sensitive session attributes for operational enrichment. |
| `created_by` | `bigint` | yes | — | Optional actor user id; no FK to preserve service migration independence. |
| `updated_by` | `bigint` | yes | — | Optional actor user id; no FK to preserve service migration independence. |
| `updated_at` | `timestamp with time zone` | no | now() | Database-maintained last modification timestamp. |

## `rbac.change_log`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | IDENTITY | Database-generated audit sequence. |
| `table_name` | `text` | no | — | Changed table within the rbac schema. |
| `operation` | `text` | no | — | INSERT, UPDATE, or DELETE. |
| `row_id` | `text` | no | ''::text | Text representation of the changed primary key. |
| `old_data` | `jsonb` | yes | — | Pre-change row JSON. |
| `new_data` | `jsonb` | yes | — | Post-change row JSON. |
| `changed_at` | `timestamp with time zone` | no | now() | Database timestamp of the mutation. |
| `changed_by` | `bigint` | yes | — | Optional logical user id responsible for the mutation. |

## `rbac.permissions`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | nextval('rbac.permissions_id_seq'::regclass) | Database-generated permission identifier. |
| `name` | `text` | no | — | Permission key in resource:action:scope form. |
| `created_at` | `timestamp with time zone` | no | now() | Database-assigned creation timestamp. |
| `updated_at` | `timestamp with time zone` | no | now() | Database-maintained last modification timestamp. |
| `created_by` | `bigint` | yes | — | Optional actor user id; intentionally no cross-service FK. |
| `updated_by` | `bigint` | yes | — | Optional actor user id; intentionally no cross-service FK. |
| `metadata` | `jsonb` | no | '{}'::jsonb | Non-sensitive extensible permission metadata. |

## `rbac.role_permissions`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `role_id` | `bigint` | no | — | Role reference with cascading delete. |
| `permission_id` | `bigint` | no | — | Permission reference with cascading delete. |

## `rbac.roles`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | IDENTITY | Database-generated role identifier. |
| `name` | `text` | no | — | Stable lowercase role key. |
| `description` | `text` | no | ''::text | Human-readable role purpose. |
| `created_at` | `timestamp with time zone` | no | now() | Database-assigned creation timestamp. |
| `color` | `text` | no | '#6366f1'::text | Six-digit hexadecimal presentation color. |
| `icon` | `text` | no | 'shield'::text | Stable presentation icon key. |
| `archived` | `boolean` | no | false | Archived roles remain readable but are not assignable. |
| `updated_at` | `timestamp with time zone` | no | now() | Database-maintained last modification timestamp. |
| `created_by` | `bigint` | yes | — | Optional actor user id; intentionally no cross-service FK. |
| `updated_by` | `bigint` | yes | — | Optional actor user id; intentionally no cross-service FK. |
| `metadata` | `jsonb` | no | '{}'::jsonb | Non-sensitive extensible role metadata. |

## `rbac.user_roles`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `user_id` | `bigint` | no | — | Logical users.users.id; intentionally no cross-service FK. |
| `role_id` | `bigint` | no | — | Assigned role reference with cascading delete. |
| `ver` | `bigint` | no | 0 | Claims version at assignment time. |

## `rbac.user_versions`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `user_id` | `bigint` | no | — | Logical users.users.id; intentionally no cross-service FK. |
| `ver` | `bigint` | no | 0 | Monotonic claims version. |

## `users.change_log`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | IDENTITY | Database-generated audit sequence. |
| `table_name` | `text` | no | — | Changed table within the users schema. |
| `operation` | `text` | no | — | INSERT, UPDATE, or DELETE. |
| `row_id` | `text` | no | ''::text | Text representation of the changed primary key. |
| `old_data` | `jsonb` | yes | — | Pre-change JSON with credential material removed. |
| `new_data` | `jsonb` | yes | — | Post-change JSON with credential material removed. |
| `changed_at` | `timestamp with time zone` | no | now() | Database timestamp of the mutation. |
| `changed_by` | `bigint` | yes | — | Optional logical user id responsible for the mutation. |

## `users.dashboard_stats`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `integer` | yes | — | Singleton materialized-view key. |
| `total` | `bigint` | yes | — | Current non-deleted user count. |
| `active` | `bigint` | yes | — | Current active user count. |
| `inactive` | `bigint` | yes | — | Current inactive user count. |
| `refreshed_at` | `timestamp with time zone` | yes | — | Time the projection was rebuilt. |

## `users.registration_daily`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `day` | `date` | yes | — | UTC registration calendar day. |
| `count` | `bigint` | yes | — | Registrations observed on the day. |

## `users.users`

| Column | Type | Null | Default / generated | Description |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | IDENTITY | Database-generated canonical user identifier. |
| `email` | `text` | no | — | Normalized login email; active rows are unique case-insensitively. |
| `password_hash` | `text` | no | — | Argon2id or bcrypt digest; never returned or copied to change logs. |
| `status` | `users.user_status` | no | 'active'::users.user_status | Database enum: active, inactive, or deleted. |
| `failed_login_attempts` | `integer` | no | 0 | Consecutive failed-login count used for lockout. |
| `locked_until` | `timestamp with time zone` | yes | — | Temporary credential lock expiry. |
| `display_name` | `text` | no | ''::text | Human-facing profile name. |
| `avatar_url` | `text` | no | ''::text | Validated profile avatar URL or empty. |
| `last_login_at` | `timestamp with time zone` | yes | — | Timestamp of the latest successful login. |
| `last_login_ip` | `text` | no | ''::text | Latest successful-login IP text representation. |
| `last_login_user_agent` | `text` | no | ''::text | Latest successful-login client user agent. |
| `created_at` | `timestamp with time zone` | no | now() | Database-assigned creation timestamp. |
| `updated_at` | `timestamp with time zone` | no | now() | Database-maintained last modification timestamp. |
| `password_history` | `text[]` | no | '{}'::text[] | Recent one-way password digests for reuse prevention. |
| `mfa_secret_enc` | `text` | no | ''::text | Application-encrypted MFA seed; never emitted to audit JSON. |
| `mfa_enabled` | `boolean` | no | false | Whether MFA verification is required for login. |
| `deleted_at` | `timestamp with time zone` | yes | — | Soft-delete timestamp retained for the configured restore window. |
| `created_by` | `bigint` | yes | — | Optional actor user id; intentionally no self-referencing FK. |
| `updated_by` | `bigint` | yes | — | Optional actor user id; intentionally no self-referencing FK. |
| `metadata` | `jsonb` | no | '{}'::jsonb | Non-sensitive extensible profile metadata. |
| `email_domain` | `text` | yes | GENERATED: split_part(lower(email), '@'::text, 2) | Generated lowercase domain extracted from email. |
| `search_document` | `tsvector` | yes | GENERATED: to_tsvector('simple'::regconfig, ((COALESCE(email, ''::text) \|\| ' '::text) \|\| COALESCE(display_name, ''::text))) | Generated full-text search document for email and display name. |

## Constraints

| Table | Name | Type | Definition |
| --- | --- | --- | --- | --- |
| `audit.audit_logs` | `audit_logs_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `audit.audit_logs` | `ck_audit_logs_action` | CHECK | `CHECK (length(btrim(action)) > 0)` |
| `audit.audit_logs` | `ck_audit_logs_entity` | CHECK | `CHECK (length(btrim(entity)) > 0)` |
| `audit.event_outbox` | `ck_event_outbox_event` | CHECK | `CHECK (length(btrim(event)) > 0)` |
| `audit.event_outbox` | `ck_event_outbox_stream` | CHECK | `CHECK (length(btrim(stream)) > 0)` |
| `audit.event_outbox` | `event_outbox_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `audit.processed_messages` | `processed_messages_pkey` | PRIMARY KEY | `PRIMARY KEY (message_id)` |
| `auth.change_log` | `change_log_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `auth.change_log` | `ck_auth_change_log_operation` | CHECK | `CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))` |
| `auth.sessions` | `ck_sessions_expiry_after_creation` | CHECK | `CHECK (expires_at > created_at)` |
| `auth.sessions` | `sessions_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `auth.sessions` | `uq_sessions_refresh_token_hash` | UNIQUE | `UNIQUE (refresh_token_hash)` |
| `rbac.change_log` | `change_log_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `rbac.change_log` | `ck_rbac_change_log_operation` | CHECK | `CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))` |
| `rbac.permissions` | `ck_permissions_name` | CHECK | `CHECK (name ~ '^[a-z0-9_]+:[a-z0-9_]+:[a-z0-9_]+$'::text)` |
| `rbac.permissions` | `permissions_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `rbac.permissions` | `uq_permissions_name` | UNIQUE | `UNIQUE (name)` |
| `rbac.role_permissions` | `fk_role_permissions_permission` | FOREIGN KEY | `FOREIGN KEY (permission_id) REFERENCES rbac.permissions(id) ON DELETE CASCADE` |
| `rbac.role_permissions` | `fk_role_permissions_role` | FOREIGN KEY | `FOREIGN KEY (role_id) REFERENCES rbac.roles(id) ON DELETE CASCADE` |
| `rbac.role_permissions` | `role_permissions_pkey` | PRIMARY KEY | `PRIMARY KEY (role_id, permission_id)` |
| `rbac.roles` | `ck_roles_color` | CHECK | `CHECK (color ~ '^#[0-9A-Fa-f]{6}$'::text)` |
| `rbac.roles` | `ck_roles_name` | CHECK | `CHECK (name ~ '^[a-z][a-z0-9_-]{1,59}$'::text)` |
| `rbac.roles` | `roles_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `rbac.roles` | `uq_roles_name` | UNIQUE | `UNIQUE (name)` |
| `rbac.user_roles` | `fk_user_roles_role` | FOREIGN KEY | `FOREIGN KEY (role_id) REFERENCES rbac.roles(id) ON DELETE CASCADE` |
| `rbac.user_roles` | `user_roles_pkey` | PRIMARY KEY | `PRIMARY KEY (user_id, role_id)` |
| `rbac.user_versions` | `user_versions_pkey` | PRIMARY KEY | `PRIMARY KEY (user_id)` |
| `users.change_log` | `change_log_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |
| `users.change_log` | `ck_users_change_log_operation` | CHECK | `CHECK (operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text]))` |
| `users.users` | `ck_users_deleted_state` | CHECK | `CHECK (status = 'deleted'::users.user_status AND deleted_at IS NOT NULL OR status <> 'deleted'::users.user_status AND deleted_at IS NULL)` |
| `users.users` | `ck_users_email_format` | CHECK | `CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text)` |
| `users.users` | `ck_users_failed_login_attempts` | CHECK | `CHECK (failed_login_attempts >= 0)` |
| `users.users` | `users_pkey` | PRIMARY KEY | `PRIMARY KEY (id)` |

## Indexes

| Table | Name | Definition |
| --- | --- | --- |
| `audit.audit_logs` | `audit_logs_created_idx` | `CREATE INDEX audit_logs_created_idx ON audit.audit_logs USING btree (created_at DESC)` |
| `audit.audit_logs` | `audit_logs_entity_created_idx` | `CREATE INDEX audit_logs_entity_created_idx ON audit.audit_logs USING btree (entity, entity_id, created_at DESC)` |
| `audit.audit_logs` | `audit_logs_msg_id_idx` | `CREATE UNIQUE INDEX audit_logs_msg_id_idx ON audit.audit_logs USING btree (msg_id)` |
| `audit.audit_logs` | `audit_logs_pkey` | `CREATE UNIQUE INDEX audit_logs_pkey ON audit.audit_logs USING btree (id)` |
| `audit.audit_logs` | `ix_audit_logs_meta_gin` | `CREATE INDEX ix_audit_logs_meta_gin ON audit.audit_logs USING gin (meta)` |
| `audit.event_outbox` | `event_outbox_created_idx` | `CREATE INDEX event_outbox_created_idx ON audit.event_outbox USING btree (created_at)` |
| `audit.event_outbox` | `event_outbox_pkey` | `CREATE UNIQUE INDEX event_outbox_pkey ON audit.event_outbox USING btree (id)` |
| `audit.event_outbox` | `ix_event_outbox_payload_gin` | `CREATE INDEX ix_event_outbox_payload_gin ON audit.event_outbox USING gin (payload)` |
| `audit.processed_messages` | `processed_messages_pkey` | `CREATE UNIQUE INDEX processed_messages_pkey ON audit.processed_messages USING btree (message_id)` |
| `auth.change_log` | `change_log_pkey` | `CREATE UNIQUE INDEX change_log_pkey ON auth.change_log USING btree (id)` |
| `auth.change_log` | `ix_auth_change_log_changed_at` | `CREATE INDEX ix_auth_change_log_changed_at ON auth.change_log USING btree (changed_at DESC)` |
| `auth.sessions` | `ix_sessions_metadata_gin` | `CREATE INDEX ix_sessions_metadata_gin ON auth.sessions USING gin (metadata)` |
| `auth.sessions` | `sessions_active_family_idx` | `CREATE INDEX sessions_active_family_idx ON auth.sessions USING btree (family_id, expires_at DESC) INCLUDE (id, user_id, refresh_token_hash, device_id) WHERE (revoked_at IS NULL)` |
| `auth.sessions` | `sessions_active_user_cover_idx` | `CREATE INDEX sessions_active_user_cover_idx ON auth.sessions USING btree (user_id, expires_at DESC, created_at DESC) INCLUDE (id, family_id, refresh_token_hash, device_id, ip, user_agent) WHERE (revoked_at IS NULL)` |
| `auth.sessions` | `sessions_family_idx` | `CREATE INDEX sessions_family_idx ON auth.sessions USING btree (family_id)` |
| `auth.sessions` | `sessions_pkey` | `CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id)` |
| `auth.sessions` | `sessions_user_idx` | `CREATE INDEX sessions_user_idx ON auth.sessions USING btree (user_id)` |
| `auth.sessions` | `uq_sessions_refresh_token_hash` | `CREATE UNIQUE INDEX uq_sessions_refresh_token_hash ON auth.sessions USING btree (refresh_token_hash)` |
| `rbac.change_log` | `change_log_pkey` | `CREATE UNIQUE INDEX change_log_pkey ON rbac.change_log USING btree (id)` |
| `rbac.change_log` | `ix_rbac_change_log_changed_at` | `CREATE INDEX ix_rbac_change_log_changed_at ON rbac.change_log USING btree (changed_at DESC)` |
| `rbac.permissions` | `ix_permissions_metadata_gin` | `CREATE INDEX ix_permissions_metadata_gin ON rbac.permissions USING gin (metadata)` |
| `rbac.permissions` | `permissions_pkey` | `CREATE UNIQUE INDEX permissions_pkey ON rbac.permissions USING btree (id)` |
| `rbac.permissions` | `uq_permissions_name` | `CREATE UNIQUE INDEX uq_permissions_name ON rbac.permissions USING btree (name)` |
| `rbac.role_permissions` | `role_permissions_permission_idx` | `CREATE INDEX role_permissions_permission_idx ON rbac.role_permissions USING btree (permission_id, role_id)` |
| `rbac.role_permissions` | `role_permissions_pkey` | `CREATE UNIQUE INDEX role_permissions_pkey ON rbac.role_permissions USING btree (role_id, permission_id)` |
| `rbac.roles` | `ix_roles_metadata_gin` | `CREATE INDEX ix_roles_metadata_gin ON rbac.roles USING gin (metadata)` |
| `rbac.roles` | `roles_pkey` | `CREATE UNIQUE INDEX roles_pkey ON rbac.roles USING btree (id)` |
| `rbac.roles` | `uq_roles_name` | `CREATE UNIQUE INDEX uq_roles_name ON rbac.roles USING btree (name)` |
| `rbac.user_roles` | `user_roles_pkey` | `CREATE UNIQUE INDEX user_roles_pkey ON rbac.user_roles USING btree (user_id, role_id)` |
| `rbac.user_roles` | `user_roles_role_idx` | `CREATE INDEX user_roles_role_idx ON rbac.user_roles USING btree (role_id, user_id)` |
| `rbac.user_versions` | `user_versions_pkey` | `CREATE UNIQUE INDEX user_versions_pkey ON rbac.user_versions USING btree (user_id)` |
| `users.change_log` | `change_log_pkey` | `CREATE UNIQUE INDEX change_log_pkey ON users.change_log USING btree (id)` |
| `users.change_log` | `ix_users_change_log_changed_at` | `CREATE INDEX ix_users_change_log_changed_at ON users.change_log USING btree (changed_at DESC)` |
| `users.dashboard_stats` | `dashboard_stats_id_unique` | `CREATE UNIQUE INDEX dashboard_stats_id_unique ON users.dashboard_stats USING btree (id)` |
| `users.registration_daily` | `registration_daily_day_unique` | `CREATE UNIQUE INDEX registration_daily_day_unique ON users.registration_daily USING btree (day)` |
| `users.users` | `ix_users_display_name_trgm` | `CREATE INDEX ix_users_display_name_trgm ON users.users USING gin (display_name gin_trgm_ops)` |
| `users.users` | `ix_users_email_trgm` | `CREATE INDEX ix_users_email_trgm ON users.users USING gin (email gin_trgm_ops)` |
| `users.users` | `ix_users_metadata_gin` | `CREATE INDEX ix_users_metadata_gin ON users.users USING gin (metadata)` |
| `users.users` | `ix_users_search_document_gin` | `CREATE INDEX ix_users_search_document_gin ON users.users USING gin (search_document)` |
| `users.users` | `uq_users_email_active` | `CREATE UNIQUE INDEX uq_users_email_active ON users.users USING btree (lower(email)) WHERE (deleted_at IS NULL)` |
| `users.users` | `users_active_created_idx` | `CREATE INDEX users_active_created_idx ON users.users USING btree (created_at DESC, id DESC) INCLUDE (email, display_name, status, last_login_at, updated_at) WHERE (deleted_at IS NULL)` |
| `users.users` | `users_email_active_idx` | `CREATE INDEX users_email_active_idx ON users.users USING btree (lower(email)) WHERE (deleted_at IS NULL)` |
| `users.users` | `users_pkey` | `CREATE UNIQUE INDEX users_pkey ON users.users USING btree (id)` |
