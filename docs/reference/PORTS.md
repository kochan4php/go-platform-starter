# Published ports

Generated from Compose manifests by `node scripts/generate-docs.mjs`. Internal-only
ports are intentionally absent. Override variables remain documented in the environment reference.

| Stack | Service | Host default | Container |
| --- | --- | ---: | ---: |
| `apps/web-admin-roles/docker-compose.yml` | `web-admin-roles` | `5176` | `80` |
| `apps/web-admin-users/docker-compose.yml` | `web-admin-users` | `5175` | `80` |
| `apps/web-auth/docker-compose.yml` | `web-auth` | `5174` | `80` |
| `apps/web/docker-compose.yml` | `web` | `5173` | `80` |
| `infra/compose.base.yml` | `postgres` | `55432` | `5432` |
| `infra/compose.base.yml` | `redis` | `56380` | `6379` |
| `infra/compose.base.yml` | `auth` | `8081` | `8081` |
| `infra/compose.base.yml` | `users` | `8082` | `8082` |
| `infra/compose.base.yml` | `rbac` | `8083` | `8083` |
| `infra/compose.base.yml` | `worker` | `8084` | `8084` |
| `infra/compose.base.yml` | `realtime` | `8085` | `8085` |
| `infra/compose.base.yml` | `scheduler` | `8086` | `8086` |
| `infra/compose.base.yml` | `gateway` | `8010` | `8000` |
| `infra/compose.base.yml` | `web` | `5173` | `8080` |
| `infra/compose.base.yml` | `web-auth` | `5174` | `8080` |
| `infra/compose.base.yml` | `web-admin-users` | `5175` | `8080` |
| `infra/compose.base.yml` | `web-admin-roles` | `5176` | `8080` |
| `infra/compose.lab.yml` | `mailpit` | `8025` | `8025` |
| `infra/compose.lab.yml` | `redisinsight` | `5540` | `5540` |
| `infra/compose.lab.yml` | `pgweb` | `8087` | `8081` |
| `infra/compose.observability.yml` | `otel-collector` | `4318` | `4318` |
| `infra/compose.observability.yml` | `tempo` | `3200` | `3200` |
| `infra/compose.observability.yml` | `loki` | `3100` | `3100` |
| `infra/compose.observability.yml` | `prometheus` | `9090` | `9090` |
| `infra/compose.observability.yml` | `alertmanager` | `9093` | `9093` |
| `infra/compose.observability.yml` | `mailpit` | `8025` | `8025` |
| `infra/compose.observability.yml` | `grafana` | `3000` | `3000` |
| `infra/compose.observability.yml` | `pyroscope` | `4040` | `4040` |
| `infra/compose.prod.yml` | `edge` | `80` | `8080` |
| `services/_template/docker-compose.yml` | `postgres` | `5432` | `5432` |
| `services/_template/docker-compose.yml` | `redis` | `6379` | `6379` |
| `services/_template/docker-compose.yml` | `service` | `8080` | `8080` |
| `services/auth/docker-compose.yml` | `postgres` | `5432` | `5432` |
| `services/auth/docker-compose.yml` | `redis` | `6379` | `6379` |
| `services/auth/docker-compose.yml` | `auth` | `8080` | `8080` |
| `services/rbac/docker-compose.yml` | `postgres` | `5432` | `5432` |
| `services/rbac/docker-compose.yml` | `redis` | `6379` | `6379` |
| `services/rbac/docker-compose.yml` | `service` | `8080` | `8080` |
| `services/users/docker-compose.yml` | `postgres` | `5432` | `5432` |
| `services/users/docker-compose.yml` | `redis` | `6379` | `6379` |
| `services/users/docker-compose.yml` | `service` | `8080` | `8080` |
| `services/worker/docker-compose.yml` | `postgres` | `5432` | `5432` |
| `services/worker/docker-compose.yml` | `redis` | `6379` | `6379` |
| `services/worker/docker-compose.yml` | `worker` | `8084` | `8080` |
