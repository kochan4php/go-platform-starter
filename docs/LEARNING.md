# Learning resources

Prefer primary documentation and the repository's executable examples.

| Topic | Start here | Apply it here |
| --- | --- | --- |
| Go | [Go documentation](https://go.dev/doc/), [language specification](https://go.dev/ref/spec) | `internal/platform`, service handlers/tests |
| HTTP | [Go `net/http`](https://pkg.go.dev/net/http), [MDN HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) | gateway middleware and proxy |
| React | [React Learn](https://react.dev/learn) | `apps/web*` |
| TypeScript | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | apps and shared packages |
| OpenAPI | [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) | service specs and contracts generator |
| PostgreSQL | [PostgreSQL documentation](https://www.postgresql.org/docs/current/) | migrations, query plans, backup/restore |
| Redis | [Redis documentation](https://redis.io/docs/latest/) | streams, rate limits, locks, pub/sub |
| Kubernetes | [Kubernetes concepts](https://kubernetes.io/docs/concepts/) | `infra/k8s`, component manifests |
| Observability | [OpenTelemetry docs](https://opentelemetry.io/docs/), [Prometheus docs](https://prometheus.io/docs/) | platform telemetry and `infra/` |
| Application security | [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | threat model and security tests |

Suggested path: onboarding → architecture/contracts → one service end to end →
its integration tests → lab observability → one restore or resilience drill.
