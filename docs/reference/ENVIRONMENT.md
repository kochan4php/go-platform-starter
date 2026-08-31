# Environment variable reference

Generated from committed `.env.example`, `infra/go.env`, and Compose interpolation.
Secret examples are always masked; the real values must come from the deployment secret store.

| Variable | Required | Default/example | Sources | Description |
| --- | :---: | --- | --- | --- |
| `ACCESS_LOG_SAMPLE_RATE` | no | `0.1` | `infra/go.env`<br>`infra/compose.observability.yml`<br>`infra/compose.prod.yml` | — |
| `ACCESS_TOKEN_SECRET` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/go.env`<br>`services/auth/.env.example`<br>`services/gateway/.env.example`<br>`services/realtime/.env.example`<br>`infra/compose.prod.yml` | set ACCESS_TOKEN_SECRET |
| `ACCESS_TTL_MINUTES` | no | `30` | `services/auth/.env.example` | — |
| `ADMIN_BOOTSTRAP_PASSWORD` | no | `<secret>` | `infra/.env.production.example`<br>`infra/compose.base.yml`<br>`infra/compose.prod.yml` | Random password is generated into this file by deploy.sh; printed once at first seed and changeable later through the normal reset flow. |
| `ADMIN_EMAIL` | no | `admin@example.com / admin@example.local` | `infra/.env.production.example`<br>`infra/compose.base.yml`<br>`infra/compose.prod.yml` | --- bootstrap admin (first deploy) ---------------------------------------- |
| `AGE_BACKUP_RECIPIENT` | no | `age1replace-with-production-recipient` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | — |
| `APP_PUBLIC_URL` | yes | `https://example.com / http://127.0.0.1:5173` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`services/users/.env.example`<br>`infra/compose.prod.yml` | Browser-facing auth URL. Switch to https:// after TLS is enabled. set APP_PUBLIC_URL |
| `APP_VERSION` | no | `dev` | `infra/go.env`<br>`infra/compose.prod.yml` | — |
| `BACKUP_INTERVAL_SECONDS` | no | `86400` | `infra/compose.prod.yml` | — |
| `BACKUP_RETENTION_DAYS` | no | `14` | `infra/compose.prod.yml` | — |
| `BCRYPT_COST` | no | `10` | `services/auth/.env.example` | — |
| `BUILD_DATE` | no | `local / unknown` | `infra/go.env`<br>`infra/compose.prod.yml` | — |
| `CONSUMER_QUOTAS` | no | `{}` | `services/gateway/.env.example` | — |
| `COOKIE_SECURE` | no | `false` | `services/auth/.env.example` | — |
| `DATABASE_URL` | no | `postgres://app:app@postgres:5432/app?sslmode=disable / postgres://app:app@127.0.0.1:5432/app?sslmode=disable / postgres://app:app@127.0.0.1:55432/app?sslmode=disable` | `infra/go.env`<br>`services/auth/.env.example`<br>`services/rbac/.env.example`<br>`services/scheduler/.env.example`<br>`services/users/.env.example`<br>`services/worker/.env.example` | Shared dev defaults for every Go service in infra/compose.base.yml. |
| `DB_BOOT_RETRY_TIMEOUT` | no | `30s` | `infra/compose.prod.yml` | — |
| `DB_CONN_MAX_IDLE_TIME` | no | `5m` | `infra/compose.prod.yml` | — |
| `DB_CONN_MAX_LIFETIME` | no | `30m` | `infra/compose.prod.yml` | — |
| `DB_IDLE_TX_TIMEOUT` | no | `30s` | `infra/compose.prod.yml` | — |
| `DB_MAX_IDLE_CONNS` | no | `8` | `infra/compose.prod.yml` | — |
| `DB_MAX_OPEN_CONNS` | no | `16` | `infra/compose.prod.yml` | — |
| `DB_PREPARE_STMT` | no | `true` | `infra/compose.prod.yml` | — |
| `DB_STATEMENT_TIMEOUT` | no | `15s` | `infra/compose.prod.yml` | — |
| `DEBUG_REQUEST_TOKEN` | no | `—` | `infra/compose.prod.yml` | — |
| `DLQ_MAX_DEPTH` | no | `10000` | `infra/compose.prod.yml` | — |
| `DOMAIN` | no | `example.com` | `infra/.env.production.example` | Public hostname clients use. Also becomes the nginx server_name. |
| `EDGE_PORT` | no | `80` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | Host port for the plain HTTP edge listener. |
| `GATEWAY_MIDDLEWARES` | no | `rate-limit,body-guard,proxy` | `services/gateway/.env.example` | — |
| `GIT_COMMIT` | no | `local / unknown` | `infra/go.env`<br>`infra/compose.prod.yml` | — |
| `GITHUB_CLIENT_ID` | yes | `—` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`infra/compose.base.yml`<br>`infra/compose.prod.yml` | — |
| `GITHUB_CLIENT_SECRET` | yes | `—` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`infra/compose.base.yml`<br>`infra/compose.prod.yml` | — |
| `GOGC` | no | `100` | `infra/compose.prod.yml` | — |
| `GOMEMLIMIT` | no | `200MiB` | `infra/compose.prod.yml` | — |
| `GOOGLE_CLIENT_ID` | yes | `—` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`infra/compose.base.yml`<br>`infra/compose.prod.yml` | — |
| `GOOGLE_CLIENT_SECRET` | yes | `—` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`infra/compose.base.yml`<br>`infra/compose.prod.yml` | — |
| `GRAFANA_ADMIN_PASSWORD` | no | `<secret>` | `infra/compose.observability.yml` | — |
| `HIBP_API_URL` | no | `https://api.pwnedpasswords.com/range` | `services/auth/.env.example` | — |
| `HIBP_TIMEOUT` | no | `3s` | `services/auth/.env.example` | — |
| `INTERNAL_SECRET` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/go.env`<br>`services/gateway/.env.example`<br>`services/rbac/.env.example`<br>`services/users/.env.example`<br>`services/worker/.env.example`<br>`infra/compose.prod.yml` | set INTERNAL_SECRET |
| `LAB_AUTH_PORT` | no | `8081` | `infra/compose.base.yml` | — |
| `LAB_GATEWAY_PORT` | no | `8010` | `infra/compose.base.yml`<br>`infra/compose.lab.yml` | — |
| `LAB_PG_PORT` | no | `55432` | `infra/compose.base.yml` | — |
| `LAB_RBAC_PORT` | no | `8083` | `infra/compose.base.yml` | — |
| `LAB_REALTIME_PORT` | no | `8085` | `infra/compose.base.yml` | — |
| `LAB_REDIS_PORT` | no | `56380` | `infra/compose.base.yml` | — |
| `LAB_SCHEDULER_PORT` | no | `8086` | `infra/compose.base.yml` | — |
| `LAB_USERS_PORT` | no | `8082` | `infra/compose.base.yml` | — |
| `LAB_WEB_ADMIN_ROLES_PORT` | no | `5176` | `infra/compose.base.yml` | — |
| `LAB_WEB_ADMIN_USERS_PORT` | no | `5175` | `infra/compose.base.yml` | — |
| `LAB_WEB_AUTH_PORT` | no | `5174` | `infra/compose.base.yml` | — |
| `LAB_WEB_PORT` | no | `5173` | `infra/compose.base.yml` | — |
| `LAB_WORKER_PORT` | no | `8084` | `infra/compose.base.yml` | — |
| `LOG_LEVEL` | no | `info` | `infra/go.env`<br>`services/_template/.env.example`<br>`services/auth/.env.example`<br>`services/gateway/.env.example`<br>`services/rbac/.env.example`<br>`services/realtime/.env.example`<br>`services/scheduler/.env.example`<br>`services/users/.env.example`<br>`services/worker/.env.example`<br>`infra/compose.prod.yml` | — |
| `LOGIN_LOCK_MINUTES` | no | `15` | `services/auth/.env.example` | — |
| `LOGIN_MAX_ATTEMPTS` | no | `5` | `services/auth/.env.example` | — |
| `MAIL_FALLBACK_HOST` | no | `—` | `infra/compose.prod.yml` | — |
| `MAIL_FALLBACK_PASS` | no | `—` | `infra/compose.prod.yml` | — |
| `MAIL_FALLBACK_PORT` | no | `587` | `infra/compose.prod.yml` | — |
| `MAIL_FALLBACK_USER` | no | `—` | `infra/compose.prod.yml` | — |
| `MAIL_FROM` | no | `noreply@example.local / noreply@example.com` | `services/worker/.env.example`<br>`infra/compose.prod.yml` | — |
| `MAIL_FROM_NAME` | no | `Platform` | `services/worker/.env.example` | — |
| `MAILER_DRIVER` | no | `console` | `services/worker/.env.example`<br>`infra/compose.prod.yml` | — |
| `MAX_ACTIVE_SESSIONS` | no | `10` | `services/auth/.env.example` | — |
| `MAX_PER_ROOM` | no | `50` | `services/realtime/.env.example` | — |
| `MIGRATION_WARN_AFTER` | no | `30s` | `infra/compose.prod.yml` | — |
| `NGINX_GZIP_LEVEL` | no | `5` | `infra/compose.prod.yml` | — |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | no | `—` | `infra/compose.prod.yml` | — |
| `OTEL_TRACE_SAMPLE_RATIO` | no | `1` | `infra/go.env`<br>`infra/compose.observability.yml`<br>`infra/compose.prod.yml` | — |
| `PASSWORD_HASH_ALGORITHM` | no | `<secret>` | `services/auth/.env.example`<br>`infra/compose.prod.yml` | — |
| `PASSWORD_HISTORY_COUNT` | no | `<secret>` | `services/auth/.env.example`<br>`infra/compose.prod.yml` | — |
| `PG_ARCHIVE_TIMEOUT` | no | `300s` | `infra/compose.prod.yml` | — |
| `PG_MAINTENANCE_WORK_MEM` | no | `64MB` | `infra/compose.prod.yml` | — |
| `PG_SHARED_BUFFERS` | no | `256MB` | `infra/compose.prod.yml` | — |
| `PG_WORK_MEM` | no | `8MB` | `infra/compose.prod.yml` | — |
| `PORT` | no | `8080 / 8000 / 8086` | `services/_template/.env.example`<br>`services/auth/.env.example`<br>`services/gateway/.env.example`<br>`services/rbac/.env.example`<br>`services/realtime/.env.example`<br>`services/scheduler/.env.example`<br>`services/users/.env.example`<br>`services/worker/.env.example` | — |
| `POSTGRES_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.observability.yml`<br>`infra/compose.prod.yml` | --- secrets (deploy.sh generates these with `openssl rand -hex 32`) ------- set POSTGRES_PASSWORD |
| `PUBLIC_WS_URL` | yes | `wss://example.com/ws / ws://127.0.0.1:8000/ws` | `infra/.env.production.example`<br>`services/realtime/.env.example`<br>`infra/compose.prod.yml` | URL the realtime-info endpoint hands to browsers for websocket connections. Use wss:// behind TLS, ws:// otherwise. Path is fixed: /ws set PUBLIC_WS_URL e.g. wss://domain/ws |
| `RATE_GLOBAL_PER_MINUTE` | no | `120 / 300` | `services/auth/.env.example`<br>`services/gateway/.env.example`<br>`infra/compose.prod.yml` | — |
| `RATE_STRICT_PER_MINUTE` | no | `10` | `services/auth/.env.example` | — |
| `REDIS_ADDR` | no | `redis:6379 / 127.0.0.1:6379 / 127.0.0.1:56380` | `infra/go.env`<br>`services/auth/.env.example`<br>`services/gateway/.env.example`<br>`services/rbac/.env.example`<br>`services/realtime/.env.example`<br>`services/scheduler/.env.example`<br>`services/users/.env.example`<br>`services/worker/.env.example` | — |
| `REDIS_AUTH_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_AUTH_PASSWORD |
| `REDIS_BACKUP_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | Replication-only credential used by the Redis RDB backup sidecar. set REDIS_BACKUP_PASSWORD |
| `REDIS_DLQ_ADMIN_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | Keep this credential offline; application containers never receive it. set REDIS_DLQ_ADMIN_PASSWORD |
| `REDIS_EXPORTER_PASSWORD` | no | `—` | `infra/compose.observability.yml` | — |
| `REDIS_EXPORTER_USER` | no | `—` | `infra/compose.observability.yml` | — |
| `REDIS_GATEWAY_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_GATEWAY_PASSWORD |
| `REDIS_OBSERVER_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_OBSERVER_PASSWORD |
| `REDIS_RBAC_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_RBAC_PASSWORD |
| `REDIS_REALTIME_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_REALTIME_PASSWORD |
| `REDIS_SCHEDULER_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_SCHEDULER_PASSWORD |
| `REDIS_USERS_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_USERS_PASSWORD |
| `REDIS_WORKER_PASSWORD` | yes | `<secret>` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | set REDIS_WORKER_PASSWORD |
| `REFRESH_GRACE_WINDOW` | no | `10s` | `services/auth/.env.example` | — |
| `REFRESH_TTL_DAYS` | no | `7` | `services/auth/.env.example` | — |
| `RESET_TTL_MINUTES` | no | `15` | `services/auth/.env.example` | — |
| `ROOMS` | no | `lobby,general` | `services/realtime/.env.example` | — |
| `SCHEDULED_JOBS` | no | `[]` | `services/scheduler/.env.example`<br>`infra/compose.base.yml`<br>`infra/compose.prod.yml` | — |
| `SESSION_CRYPTO_KEYS` | yes | `change-me-active,change-me-previous` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`infra/compose.prod.yml` | set SESSION_CRYPTO_KEYS |
| `SHUTDOWN_TIMEOUT` | no | `20s` | `infra/compose.prod.yml` | — |
| `SLOW_QUERY_SAMPLE_RATE` | no | `1` | `infra/go.env`<br>`infra/compose.observability.yml`<br>`infra/compose.prod.yml` | — |
| `SLOW_QUERY_THRESHOLD` | no | `500ms` | `services/_template/.env.example`<br>`services/auth/.env.example`<br>`services/users/.env.example` | — |
| `SLOW_REQUEST_THRESHOLD_MS` | no | `500` | `services/gateway/.env.example` | — |
| `SMTP_HOST` | yes | `—` | `services/worker/.env.example`<br>`infra/compose.prod.yml` | — |
| `SMTP_PASS` | yes | `—` | `services/worker/.env.example`<br>`infra/compose.prod.yml` | — |
| `SMTP_PORT` | no | `587` | `services/worker/.env.example`<br>`infra/compose.prod.yml` | — |
| `SMTP_USER` | yes | `—` | `services/worker/.env.example`<br>`infra/compose.prod.yml` | — |
| `STACK_ENV` | no | `prod` | `infra/.env.production.example`<br>`infra/compose.prod.yml` | Copy to infra/.env.production (gitignored) and fill in. deploy.sh generates this file with random secrets on first run if it does not exist.  Stack identity — isolates project name, containers and state per env. |
| `STREAM_ENCRYPTION_KEYS` | yes | `—` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`infra/compose.prod.yml` | Optional: enables AES-GCM encryption for Redis Stream payloads. |
| `STREAM_MAXLEN` | no | `100000` | `infra/compose.prod.yml` | — |
| `STREAM_SIGNING_KEYS` | yes | `change-me-active,change-me-previous` | `infra/.env.production.example`<br>`services/auth/.env.example`<br>`infra/compose.prod.yml` | set STREAM_SIGNING_KEYS |
| `TRUSTED_DOMAINS` | yes | `https://example.com,http://example.com / http://127.0.0.1:5173,http://127.0.0.1:5174` | `infra/.env.production.example`<br>`services/gateway/.env.example`<br>`infra/compose.prod.yml` | Origins allowed by the gateway CORS layer (same-origin deployment makes this nearly moot, but keep it aligned with how users reach the site). set TRUSTED_DOMAINS |
| `UPSTREAMS` | no | `{"auth":"http://127.0.0.1:8081","users":"http://127.0.0.1:8082","rbac":"http://127.0.0.1:8083","worker":"http://127.0.0.1:8084"}` | `services/gateway/.env.example` | — |
| `WEBHOOK_ALLOWED_HOSTS` | no | `—` | `infra/compose.prod.yml` | — |
| `WEBSOCKET_ROUTES` | no | `{"/ws":"http://127.0.0.1:8085"}` | `services/gateway/.env.example` | — |
| `WORKER_CONCURRENCY` | no | `4` | `infra/compose.prod.yml` | — |
| `WORKER_HANDLERS` | no | `email,audit,webhook` | `services/worker/.env.example` | — |
| `WORKER_MIN_IDLE` | no | `30s` | `infra/compose.prod.yml` | — |
| `WORKER_XREAD_COUNT` | no | `100` | `infra/compose.prod.yml` | — |
| `WS_HEARTBEAT_INTERVAL` | no | `30s` | `infra/compose.prod.yml` | — |
