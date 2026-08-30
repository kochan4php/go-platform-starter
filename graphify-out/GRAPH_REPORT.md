# Graph Report - go-platform-starter  (2026-08-31)

## Corpus Check
- 406 files · ~201,506 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2764 nodes · 5148 edges · 245 communities (176 shown, 69 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 259 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2216d0e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- testing.T
- context.Context
- net/http.Request
- GormLogger
- devDependencies
- ui-system.tsx
- devDependencies
- auth-ui.tsx
- auth service (base mesh)
- ui/package.json
- App.tsx
- Route
- resilientTransport
- UsersPage.tsx
- ignore
- middleware.go
- DashboardShell.tsx
- auth service API (OpenAPI doc)
- ErrBadRequest
- Client
- _template/gen/gen.go
- What You Must Do When Invoked
- auth/gen/gen.go
- scripts
- net/http.Handler
- OK
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- Consumer
- GracefulRun
- dev-all.sh
- check-coverage.mjs
- On-call alert runbook
- Migrate
- web (host shell) Docker Compose Service
- contracts/package.json
- dependencies
- devDependencies
- ARCHITECTURE overview
- go-platform-starter README Overview
- dependencies
- devDependencies
- PublishWithAuditOutbox
- resilience-drill.sh
- BACKLOG (1.202 improvement items)
- compilerOptions
- RBAC permission/role catalog API
- Contracts Pipeline (spec-first)
- Security Posture
- InitTracer
- index.tsx
- /graphify Skill Command
- ui.tsx
- e2e-mesh.sh
- template-service Deployment
- web-admin-users/package.json
- renovate.json
- deploy.sh
- dbdocs/main.go
- remotes.d.ts
- index.ts
- time.Time
- ClaimsClient
- main.tsx
- ADR-0001: Fresh-build Pivot
- main
- e2e_test.go
- Security policy
- rbac Deployment
- users Deployment
- scripts
- Handlers
- terser
- gen.d.ts
- check-deps.mjs
- template docker-compose app service
- Schema registry and data dictionary
- MockIntersectionObserver
- MockIntersectionObserver
- web/package.json
- main
- MockIntersectionObserver
- main
- newUsersFixture
- compose-specs.mjs
- golangci-lint Configuration
- check-budget.mjs
- realtime Deployment
- .ListUsers
- startFixture
- web/vite.config.ts
- composespec/main.go
- graphify reference: extra exports and benchmark
- Profile
- log/slog.Logger
- TestRoomsBroadcastDenyAndForceLogoutKick
- OpenDatabase
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- gateway/main.go
- graphify reference: GitHub clone and cross-repo merge
- @tailwindcss/vite
- @types/react-dom
- typescript
- mailer.go
- vitest
- config-entrypoint.sh
- Reliability & Resilience
- graphify reference: transcribe video and audio
- @testing-library/react
- ListUsersParams
- @types/react-dom
- vitest
- otel-collector service
- deploy-demo.sh
- deploy-uat.sh
- web-admin-roles/vite.config.ts
- web-admin-users/vite.config.ts
- web-auth/vite.config.ts
- compose.prod.yml (Production Stack)
- github.com/kochan4php/go-platform-starter
- pnpm workspace config (apps/*, packages/*)
- platform_test.go
- AGENTS.md
- check-migrations.mjs
- extraction-spec.md
- main
- Onboarding Guide
- StartRedis
- Publish
- StartPostgres
- Service
- @tailwindcss/vite
- Data and migration operations
- AUTH_UX.md
- NewRequestValidator
- Testing & QA
- Audit
- users/gen/gen.go
- Handlers
- BREAK_GLASS.md
- PENTEST_CHECKLIST.md
- THREAT_MODEL.md
- pre-commit
- annotate-deploy.sh
- PERFORMANCE.md
- auth/internal/jwt.go
- LoadDotEnv
- Recoverer
- performance.js
- redis-bigkeys.sh
- main
- ParseAccessTokenRing
- K6.md
- check-contracts.mjs
- RequireSessionIdentity
- openapi-fuzz.mjs
- TestDatabaseTimeoutsPreserveDSN
- NewLogger
- ProxyHandler
- backup.sh
- check-migration-safety.sh
- time.Duration
- restore-test.sh
- WebVitals
- gorm.io/gorm.DB
- Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md
- SpecRouteTable
- chaos-qa.sh
- newRBACFixture
- DoD Evidence Checklist
- @vitejs/plugin-react
- Architecture & scalability engineering
- ResizeAvatar
- Schema governance audit
- check-template-drift.mjs
- Q: Implement all Engineering items in Architecture & Scalability from docs/BACKLOG.md
- check-architecture.mjs
- Profile
- MiddlewareRegistry
- Q: Implement all Engineering items in the Data & Migrations backlog
- RunBackfill
- Fail
- .seedCatalog
- pull_request_template.md
- InvalidParamFormatError
- RequiredHeaderError
- UnescapedCookieParamError
- UnmarshalingParamError
- RequiredHeaderError
- UnmarshalingParamError
- RequiredHeaderError
- README.md
- db-maintenance.sh
- mask-data.sh
- migration-dry-run.sh
- schema-drift.sh
- NewGormLogger
- debugRequest
- .Kick
- InvalidParamFormatError
- UnescapedCookieParamError
- InvalidParamFormatError
- UnescapedCookieParamError
- InvalidParamFormatError
- @types/react
- TooManyValuesForParamError
- Publisher
- RoleInput
- Loggerish
- Service

## God Nodes (most connected - your core abstractions)
1. `OK()` - 48 edges
2. `WriteError()` - 48 edges
3. `Service` - 45 edges
4. `main()` - 30 edges
5. `Handlers` - 30 edges
6. `ErrBadRequest()` - 29 edges
7. `useToast()` - 27 edges
8. `Consumer` - 27 edges
9. `main()` - 26 edges
10. `ServerInterfaceWrapper` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Deprecation Mechanics (RFC-9745)` --references--> `Deprecation()`  [EXTRACTED]
  docs/API_VERSIONING.md → internal/platform/security.go
- `User Taste Profile` --semantically_similar_to--> `CI: web job (lint/test/build/budget)`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → .github/workflows/ci.yml
- `User Taste Profile` --semantically_similar_to--> `docs/BACKLOG.md Improvement Backlog`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `User Taste Profile` --semantically_similar_to--> `Host Bundle-Size Budget Gate`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `Graphify Skill-Trigger Directive` --semantically_similar_to--> `Root CLAUDE.md graphify Project Instructions`  [INFERRED] [semantically similar]
  .claude/CLAUDE.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Placeholder Deployment manifests copied from shared template** — services_rbac_deploy_k8s_deployment_deployment, services_realtime_deploy_k8s_deployment_deployment, services_users_deploy_k8s_deployment_deployment, services_worker_deploy_k8s_deployment_deployment [EXTRACTED 0.90]
- **Migrate-before-rollout pattern (PLAN item 8)** — services_rbac_deploy_k8s_migrate_job_migratejob, services_users_deploy_k8s_migrate_job_migratejob, services_worker_deploy_k8s_migrate_job_migratejob [EXTRACTED 0.95]
- **BACKLOG.md's 18 improvement categories** — docs_backlog_security, docs_backlog_performance, docs_backlog_uiux_auth, docs_backlog_uiux_dashboard_shell, docs_backlog_uiux_manage_users, docs_backlog_uiux_roles_permissions, docs_backlog_reliability_resilience, docs_backlog_observability, docs_backlog_testing_qa, docs_backlog_developer_experience, docs_backlog_architecture_scalability, docs_backlog_data_migrations, docs_backlog_api_contracts, docs_backlog_docs_governance, docs_backlog_cicd_release, docs_backlog_infra_ops, docs_backlog_frontend_engineering, docs_backlog_product_roadmap [EXTRACTED 1.00]
- **CI Workflow Job Set** — _github_workflows_ci_workflow, _github_workflows_ci_commitlint_job, _github_workflows_ci_go_job, _github_workflows_ci_web_job, _github_workflows_ci_playwright_job, _github_workflows_ci_security_job [EXTRACTED 1.00]
- **Graphify Skill Reference Document Set** — _claude_skills_graphify_skill_graphify_skill_command, _claude_skills_graphify_references_add_watch_reference, _claude_skills_graphify_references_exports_reference, _claude_skills_graphify_references_extraction_spec_reference, _claude_skills_graphify_references_github_and_merge_reference, _claude_skills_graphify_references_hooks_reference, _claude_skills_graphify_references_query_reference, _claude_skills_graphify_references_transcribe_reference, _claude_skills_graphify_references_update_reference [EXTRACTED 1.00]
- **Module Federation Host (web) and Remote Micro-Frontends** — apps_web_docker_compose_web_service, apps_web_auth_docker_compose_web_auth_service, apps_web_admin_users_docker_compose_web_admin_users_service, apps_web_admin_roles_docker_compose_web_admin_roles_service [EXTRACTED 1.00]
- **Production single public entry pattern: edge nginx fronts gateway and all microfrontend shells** — infra_compose_prod_edge, infra_compose_prod_gateway, infra_compose_prod_web, infra_compose_prod_web_auth, infra_compose_prod_web_admin_users, infra_compose_prod_web_admin_roles [EXTRACTED 1.00]
- **Local dev stack assembled by layering compose files (base + lab overlay + optional observability profile)** — infra_compose_base, infra_compose_lab, infra_compose_observability [INFERRED 0.75]
- **Observability pipeline: OTel trace collection, Prometheus metrics scraping, Grafana visualization** — infra_compose_observability_otel_collector, infra_otel_collector, infra_compose_observability_prometheus, infra_prometheus_prometheus, infra_compose_observability_grafana, infra_grafana_provisioning_datasources_prometheus, infra_grafana_provisioning_dashboards_provider [INFERRED 0.75]
- **Services enforcing permissions from the RBAC catalog** — services_rbac_openapi_permissioncatalog, services_users_openapi_profileapi, services_worker_openapi_auditviewer [INFERRED 0.80]
- **Auth Service Kubernetes Deployment Stack** — services_auth_deploy_k8s_deployment_auth, services_auth_deploy_k8s_hpa_auth, services_auth_deploy_k8s_service_auth, services_auth_deploy_k8s_migrate_job_auth_migrate [INFERRED 0.85]
- **Auth Session Lifecycle Flow (login/refresh/logout/session management)** — services_auth_openapi_login, services_auth_openapi_refresh, services_auth_openapi_logout, services_auth_openapi_listsessions, services_auth_openapi_revokesession, services_auth_openapi_revokeallsessions [INFERRED 0.85]
- **Identity/token security flow across gateway, auth service, and frontend** — docs_contracts_identity_header_contract, docs_token_policy_access_refresh_split, docs_security_csrf_mitigation, docs_dod_hardening_extras [INFERRED 0.85]
- **Shared Kubernetes Deployment/HPA/Service Pattern Across Frontend Apps** — apps_web_admin_roles_deploy_k8s_deployment_deployment, apps_web_admin_users_deploy_k8s_deployment_deployment, apps_web_auth_deploy_k8s_deployment_deployment, apps_web_deploy_k8s_deployment_deployment [INFERRED 0.85]
- **Service Isolation Enforcement Mechanism** — readme_service_isolation_principle, _golangci_config, _golangci_shared_code_must_not_import_services_rule, _golangci_testutil_must_not_import_services_rule [INFERRED 0.85]
- **Spec-first contract pipeline: spec, codegen/typed client, version freeze, and PR gate enforcing it together** — docs_contracts_openapi_spec_source_of_truth, docs_contracts_typed_client_pipeline, docs_api_versioning_v1_frozen_contract, docs_onboarding_pr_checklist [INFERRED 0.85]
- **Template Service Kubernetes Deployment Stack** — services__template_deploy_k8s_deployment_template_service, services__template_deploy_k8s_hpa_template_service, services__template_deploy_k8s_service_template_service, services__template_deploy_k8s_migrate_job_template_service_migrate [INFERRED 0.85]

## Communities (245 total, 69 thin omitted)

### Community 0 - "testing.T"
Cohesion: 0.13
Nodes (29): testing.T, capturedEvent, capturedPublisher, TestRefreshCookieUsesBrowserCSRFProtections(), fixture, redis.Client, indexOf(), mustRegister() (+21 more)

### Community 1 - "context.Context"
Cohesion: 0.12
Nodes (19): context.Context, github.com/lib/pq.StringArray, AuthResult, passwordRecord, ActiveSecret(), sessionView, TokenIntrospection, User (+11 more)

### Community 2 - "net/http.Request"
Cohesion: 0.06
Nodes (15): net/http.Request, net/http.ResponseWriter, Drain(), Healthz(), ServerInterfaceWrapper, Unimplemented, MiddlewareFunc, ServerInterfaceWrapper (+7 more)

### Community 3 - "GormLogger"
Cohesion: 0.28
Nodes (3): queryOperation(), slowQuerySampled(), GormLogger

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui, @tanstack/react-query, devDependencies (+39 more)

### Community 5 - "ui-system.tsx"
Cohesion: 0.06
Nodes (30): el, qc, deleteMock, getMock, patchMock, permissions, postMock, putMock (+22 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, react, react-dom, @starter/contracts, @starter/ui, devDependencies, jsdom, msw (+39 more)

### Community 7 - "auth-ui.tsx"
Cohesion: 0.10
Nodes (40): api, apiError(), AuthApiError, forgot(), login(), LoginResult, readMessage(), register() (+32 more)

### Community 8 - "auth service (base mesh)"
Cohesion: 0.10
Nodes (37): auth service (base mesh), gateway service (base mesh), postgres service (base mesh), rbac service (base mesh), realtime service (base mesh), redis service (base mesh), users service (base mesh), web (shell) service (base mesh) (+29 more)

### Community 9 - "ui/package.json"
Cohesion: 0.06
Nodes (36): description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react, @types/react-dom (+28 more)

### Community 10 - "App.tsx"
Cohesion: 0.08
Nodes (30): AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), handleLoggedIn(), handleReauthenticated(), LoginPage, LoginResult (+22 more)

### Community 11 - "Route"
Cohesion: 0.21
Nodes (8): Route, Upstreams, Config, Matcher, NewMatcher(), ParseUpstreams(), routeBodyGuard(), TestConsumerQuotaUsesAuthenticatedSubject()

### Community 12 - "resilientTransport"
Cohesion: 0.10
Nodes (25): context.CancelFunc, io.ReadCloser, net/http.Header, net/http.Response, net/http.Transport, sync/atomic.Uint64, bufferedWriter, cachedResponse (+17 more)

### Community 13 - "UsersPage.tsx"
Cohesion: 0.08
Nodes (36): ActivityFeed(), ActivityItem, ColumnKey, columnLabel(), copyText(), csvCell(), dateBoundary(), DEFAULT_COLUMNS (+28 more)

### Community 14 - "ignore"
Cohesion: 0.06
Nodes (34): files, ignore, enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript (+26 more)

### Community 15 - "middleware.go"
Cohesion: 0.16
Nodes (15): chi.Context, chiRouteContext(), CorrelationID(), LoggerFromContext(), newRequestID(), Observe(), RequestIDFromContext(), RequestLogger() (+7 more)

### Community 16 - "DashboardShell.tsx"
Cohesion: 0.06
Nodes (29): useGatewayHealth(), OfflineBanner(), SessionExpiringBanner(), CommandPalette(), CommandPaletteProps, fuzzy(), PaletteItem, NavItem (+21 more)

### Community 17 - "auth service API (OpenAPI doc)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "ErrBadRequest"
Cohesion: 0.10
Nodes (26): Claims, Loggerish, PermissionInfo, ErrBadRequest(), ErrConflict(), ErrInternal(), ErrUnauthorized(), AppError (+18 more)

### Community 19 - "Client"
Cohesion: 0.13
Nodes (12): sync.RWMutex, Hub, Client, prometheusGauge, contains(), Handlers, NewHandlers(), NewHandlersWithKeyRing() (+4 more)

### Community 20 - "_template/gen/gen.go"
Cohesion: 0.15
Nodes (14): chi.Router, ChiServerOptions, EnvelopeOK, MiddlewareFunc, RequiredHeaderError, RequiredParamError, ServerInterface, TooManyValuesForParamError (+6 more)

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "auth/gen/gen.go"
Cohesion: 0.10
Nodes (25): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, AdminSetUserStateJSONBody, AdminSetUserStateJSONBodyStatus, AdminSetUserStateJSONRequestBody, ChangePasswordJSONBody, ChangePasswordJSONRequestBody, ConfirmPasswordJSONBody (+17 more)

### Community 23 - "scripts"
Cohesion: 0.06
Nodes (30): @axe-core/playwright, @biomejs/biome, js-yaml, devDependencies, @axe-core/playwright, @biomejs/biome, js-yaml, @playwright/test (+22 more)

### Community 24 - "net/http.Handler"
Cohesion: 0.13
Nodes (21): CreatePermissionJSONBody, CreatePermissionJSONRequestBody, RoleInput, SetUserRolesJSONBody, SetUserRolesJSONRequestBody, UpdateRoleJSONBody, UpdateRoleJSONRequestBody, net/http.Handler (+13 more)

### Community 25 - "OK"
Cohesion: 0.12
Nodes (18): ctxKeyHash, forgotInput, loginInput, OK(), WriteError(), registerInput, resetInput, clientIP() (+10 more)

### Community 26 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 27 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 28 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 29 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 30 - "Consumer"
Cohesion: 0.11
Nodes (14): Consumer, WorkerHandler, redis.XMessage, contains(), freshMarkers(), redis.Client, handlerKey(), handlerName() (+6 more)

### Community 31 - "GracefulRun"
Cohesion: 0.40
Nodes (4): GracefulRun(), shutdownTimeout(), main(), config

### Community 32 - "dev-all.sh"
Cohesion: 0.15
Nodes (22): ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra(), DATABASE_URL, die(), docker_publishes() (+14 more)

### Community 33 - "check-coverage.mjs"
Cohesion: 0.11
Nodes (16): badgeDir, byPackage, changed, changedLines, changedRows, changedScore, listed, merged (+8 more)

### Community 34 - "On-call alert runbook"
Cohesion: 0.05
Nodes (39): Deploy annotations, Observability, Postgres and Redis, Profiling, Run the stack, Sampling and focused debug, SLO and error budget policy, Synthetic and external uptime (+31 more)

### Community 35 - "Migrate"
Cohesion: 0.14
Nodes (8): main(), Migrate(), migrationURL(), TestMigrationURLUsesServiceHistory(), MigrateUp(), migrateUp(), MigrateUp(), MigrateUp()

### Community 36 - "web (host shell) Docker Compose Service"
Cohesion: 0.10
Nodes (20): web-admin-roles Kubernetes Deployment, web-admin-roles HorizontalPodAutoscaler, web-admin-roles Kubernetes Service, web-admin-roles Docker Compose Service, web-admin-roles Dev HTML Entry, web-admin-users Kubernetes Deployment, web-admin-users HorizontalPodAutoscaler, web-admin-users Kubernetes Service (+12 more)

### Community 37 - "contracts/package.json"
Cohesion: 0.09
Nodes (22): openapi-fetch, openapi-typescript, dependencies, openapi-fetch, description, devDependencies, js-yaml, openapi-typescript (+14 more)

### Community 38 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, gsap, @gsap/react, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui (+9 more)

### Community 39 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, @testing-library/react, @testing-library/user-event, @types/react (+9 more)

### Community 40 - "ARCHITECTURE overview"
Cohesion: 0.12
Nodes (17): Schema-per-Service Decision, ARCHITECTURE overview, Fail-Closed Route Registry, Gateway Topology, JWT Verified Once At Edge, Observability Flow, Redis Streams Event Backbone, Schema-per-Service Data Ownership (+9 more)

### Community 41 - "go-platform-starter README Overview"
Cohesion: 0.19
Nodes (16): User Taste Profile, CI: commitlint job, CI: go job (lint/build/test/contracts), CI: playwright smoke job, CI: security (Trivy + Semgrep) job, CI: web job (lint/test/build/budget), CI Workflow, release-please job (+8 more)

### Community 42 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @phosphor-icons/react, react, react-dom, react-router-dom, @starter/contracts, @starter/ui, @tanstack/react-query (+7 more)

### Community 43 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 44 - "PublishWithAuditOutbox"
Cohesion: 0.17
Nodes (9): TestTraceAndBaggageMapRoundTrip(), redis.Client, PublishWithAuditOutbox(), ExtractTraceMap(), InjectTraceMap(), TraceIDFromContext(), sentryReporter, RedisPublisher (+1 more)

### Community 45 - "resilience-drill.sh"
Cohesion: 0.22
Nodes (8): v6 Definition of Done, Hardening Extras Found During Execution, DoD Wave Gates (0-7), DRILL_DSN, DRILL_REDIS, E2E_ADMIN_PASSWORD, resilience-drill.sh script, start_auth()

### Community 46 - "BACKLOG (1.202 improvement items)"
Cohesion: 0.12
Nodes (19): GORM Replaces sqlc/pgx-direct, BACKLOG (1.202 improvement items), Backlog: CI/CD & Release, Backlog: Data & Migrations, Backlog: Docs & Governance, Backlog: Frontend Engineering, Backlog: Infra & Ops, Backlog: Performance (+11 more)

### Community 47 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+5 more)

### Community 48 - "RBAC permission/role catalog API"
Cohesion: 0.14
Nodes (14): rbac codegen config, RBAC permission/role catalog API, resolveClaims internal endpoint, realtimeInfo endpoint (ws url/protocol), users codegen config, users Profile CRUD API, worker Deployment, worker HorizontalPodAutoscaler (+6 more)

### Community 49 - "Contracts Pipeline (spec-first)"
Cohesion: 0.28
Nodes (9): Spec-First Without a Behavioral Contract, API Versioning Policy, Deliberately Avoided Versioning Practices, Deprecation Mechanics (RFC-9745), /api/v1 Frozen Contract, Adding v2 API Strategy, Backlog: API & Contracts, Contracts Pipeline (spec-first) (+1 more)

### Community 50 - "Security Posture"
Cohesion: 0.24
Nodes (11): Backlog: Security, Identity-Header Contract, Security Posture, CSRF Mitigation by Construction, Security Headers Policy, Security Scanning (gosec/Trivy/semgrep), Secrets Management, Token Storage Policy (+3 more)

### Community 51 - "InitTracer"
Cohesion: 0.24
Nodes (8): go.opentelemetry.io/otel/sdk/resource.Resource, buildValue(), recordAPIError(), recordBuildInfo(), InitTracer(), newResource(), traceSampleRatio(), trimSchemeHTTP()

### Community 52 - "index.tsx"
Cohesion: 0.07
Nodes (33): api, PermissionInfo, Role, AuditEntry, download(), exportMatrixPng(), iconGlyphs, iconNames (+25 more)

### Community 53 - "/graphify Skill Command"
Cohesion: 0.20
Nodes (11): Graphify Skill-Trigger Directive, Add & Watch Reference Doc, Exports & Benchmark Reference Doc, Extraction Subagent Prompt Spec, GitHub Clone & Cross-Repo Merge Reference Doc, Commit Hook & CLAUDE.md Integration Reference Doc, Query/Path/Explain Reference Doc, Transcribe Video/Audio Reference Doc (+3 more)

### Community 54 - "ui.tsx"
Cohesion: 0.08
Nodes (28): DeleteRoleModal(), RoleModal(), Root(), applyTheme(), HealthState, Probe(), Theme, useTheme() (+20 more)

### Community 55 - "e2e-mesh.sh"
Cohesion: 0.12
Nodes (16): ACCESS_TOKEN_SECRET, APP_PUBLIC_URL, BCRYPT_COST, DATABASE_URL, down(), E2E_ADMIN_PASSWORD, E2E_REMOTE_AUTH_URL, E2E_REMOTE_RBAC_URL (+8 more)

### Community 56 - "template-service Deployment"
Cohesion: 0.27
Nodes (11): template-service Deployment, template-service HorizontalPodAutoscaler, template-service-migrate Job, template-service k8s Service, auth Deployment, auth HorizontalPodAutoscaler, auth-migrate Job, auth k8s Service (+3 more)

### Community 57 - "web-admin-users/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, preview, test, type (+1 more)

### Community 58 - "renovate.json"
Cohesion: 0.20
Nodes (9): config:recommended, dependencies, :semanticCommits, :semanticCommitScope(deps), extends, labels, packageRules, rangeStrategy (+1 more)

### Community 59 - "deploy.sh"
Cohesion: 0.28
Nodes (12): APP_VERSION, BUILD_DATE, compose(), die(), docker_publishes(), ensure_docker(), GIT_COMMIT, log() (+4 more)

### Community 60 - "dbdocs/main.go"
Cohesion: 0.20
Nodes (19): audit(), cell(), constraintKind(), dbml(), dbmlType(), fatal(), fingerprint(), inspect() (+11 more)

### Community 61 - "remotes.d.ts"
Cohesion: 0.20
Nodes (7): Document, web_admin_roles/RolesPage, web_admin_users/UsersPage, web_auth/ForgotPage, web_auth/LoginPage, web_auth/RegisterPage, web_auth/ResetPage

### Community 62 - "index.ts"
Cohesion: 0.09
Nodes (30): api, AuthPage, FEATURES, PAGE, Window, AuthContext, AuthProvider(), SessionUser (+22 more)

### Community 63 - "time.Time"
Cohesion: 0.11
Nodes (19): Permission, Role, Session, time.Time, permissionRow, Session, randomToken(), totpCode() (+11 more)

### Community 64 - "ClaimsClient"
Cohesion: 0.17
Nodes (10): container/list.Element, container/list.List, net/http.Client, ClaimsClient, HTTPWebhookProvider, recordingWebhook, WebhookDelivery, WebhookProvider (+2 more)

### Community 65 - "main.tsx"
Cohesion: 0.21
Nodes (8): App(), observeWebVitals(), rating(), report(), VitalName, el, worker, handlers

### Community 66 - "ADR-0001: Fresh-build Pivot"
Cohesion: 0.33
Nodes (6): ADR-0001: Fresh-build Pivot, Backlog: Architecture & Scalability, Scaling Guide, Perf Smoke Baseline Through Gateway, Sharding/Splitting Triggers, main()

### Community 67 - "main"
Cohesion: 0.18
Nodes (13): StartPprof(), redis.Client, NewRedisClient(), WaitForRedis(), config, config, closeDB(), main() (+5 more)

### Community 68 - "e2e_test.go"
Cohesion: 0.31
Nodes (12): envelope, proc, os/exec.Cmd, buildBinaries(), call(), flattenEnv(), freePort(), login() (+4 more)

### Community 69 - "Security policy"
Cohesion: 0.50
Nodes (3): Reporting a vulnerability, Security policy, Supported versions

### Community 70 - "rbac Deployment"
Cohesion: 0.29
Nodes (7): rbac Deployment, rbac HorizontalPodAutoscaler, rbac migrate Job, rbac Service, rbac compose postgres, rbac compose redis, rbac compose service

### Community 71 - "users Deployment"
Cohesion: 0.29
Nodes (7): users Deployment, users HorizontalPodAutoscaler, users migrate Job, users Service, users compose postgres, users compose redis, users compose service

### Community 72 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, check:budget, dev, preview, test

### Community 73 - "Handlers"
Cohesion: 0.21
Nodes (4): DeleteRoleParams, Handlers, Service, NewHandlers()

### Community 75 - "gen.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 76 - "check-deps.mjs"
Cohesion: 0.40
Nodes (3): exts, nodeBuiltins, violations

### Community 77 - "template docker-compose app service"
Cohesion: 0.33
Nodes (6): template docker-compose postgres service, template docker-compose redis service, template docker-compose app service, auth docker-compose app service, auth docker-compose postgres service, auth docker-compose redis service

### Community 78 - "Schema registry and data dictionary"
Cohesion: 0.11
Nodes (18): `audit.audit_logs`, `audit.event_outbox`, `audit.processed_messages`, `auth.change_log`, `auth.sessions`, Constraints, Indexes, `rbac.change_log` (+10 more)

### Community 81 - "web/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 82 - "main"
Cohesion: 0.25
Nodes (7): SweepSessions(), RegisterSessionMetrics(), lowerEnv(), main(), pingDB(), seedAdmin(), sqlClose()

### Community 84 - "main"
Cohesion: 0.27
Nodes (10): encoding/json.RawMessage, jobConfig, closeDB(), envFile(), redis.Client, main(), parseJobs(), pingDB() (+2 more)

### Community 85 - "newUsersFixture"
Cohesion: 0.15
Nodes (13): profileOption, migrateUp(), RedisPublisher, redis.Client, MigrateUp(), Profile, redis.Client, Service (+5 more)

### Community 86 - "compose-specs.mjs"
Cohesion: 0.40
Nodes (4): merged, outDir, root, servicesDir

### Community 87 - "golangci-lint Configuration"
Cohesion: 0.67
Nodes (4): golangci-lint Configuration, depguard rule: shared code must not import services, depguard rule: testutil must not import services, Single go.mod / Compiler-Enforced Service Isolation

### Community 88 - "check-budget.mjs"
Cohesion: 0.50
Nodes (3): budget, chunks, kb

### Community 89 - "realtime Deployment"
Cohesion: 0.50
Nodes (4): realtime Deployment, realtime HorizontalPodAutoscaler, realtime PodDisruptionBudget, realtime Service

### Community 90 - ".ListUsers"
Cohesion: 0.14
Nodes (15): testing.B, ListOK(), ParsePagination(), BenchmarkWriteJSON(), TestParsePagination(), profileInput, listData, Meta (+7 more)

### Community 91 - "startFixture"
Cohesion: 0.20
Nodes (20): recordingMailer, FlushAuditOutbox(), closeDB(), fixture, redis.Client, openDB(), publish(), retryUntil() (+12 more)

### Community 94 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 95 - "Profile"
Cohesion: 0.33
Nodes (4): Profile, RoleSummary, Config, RoleSummary

### Community 96 - "log/slog.Logger"
Cohesion: 0.15
Nodes (13): log/slog.Logger, cachedClaims, claimEntry, Readyz(), withBaseLogger(), chi.Router, NewRouter(), Checker (+5 more)

### Community 97 - "TestRoomsBroadcastDenyAndForceLogoutKick"
Cohesion: 0.26
Nodes (11): github.com/coder/websocket.Conn, net/http/httptest.Server, dialWS(), mint(), readMsg(), send(), TestRoomsBroadcastDenyAndForceLogoutKick(), redis.Client (+3 more)

### Community 98 - "OpenDatabase"
Cohesion: 0.62
Nodes (6): databaseTimeouts(), envBool(), envDuration(), envInt(), OpenDatabase(), TestDatabaseEnvironmentDefaultsAndOverrides()

### Community 99 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 100 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 101 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 102 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 103 - "gateway/main.go"
Cohesion: 0.18
Nodes (16): consumerQuotaPolicy, ctxKeyAuth, net/netip.Prefix, redis_rate.Limiter, clientIP(), corsHandler(), edgeRateLimit(), envFile() (+8 more)

### Community 108 - "mailer.go"
Cohesion: 0.20
Nodes (10): net/smtp.Auth, BuildMIME(), Mail, Mailer, NewMailer(), TestBuildMIME(), ConsoleMailer, FallbackMailer (+2 more)

### Community 111 - "Reliability & Resilience"
Cohesion: 0.25
Nodes (7): Backup and disaster recovery, Deliberate non-mechanisms, Deployment safety, Multi-region readiness checklist, Reliability & Resilience, Runtime controls, Worker and DLQ operations

### Community 114 - "ListUsersParams"
Cohesion: 0.18
Nodes (6): ListUsersParamsCount, ListUsersParamsLimit, ListUsersParamsOrder, ListUsersParamsPresence, ListUsersParamsSort, ListUsersParams

### Community 142 - "platform_test.go"
Cohesion: 0.19
Nodes (11): fail(), main(), discardLogger(), TestEnvelopeGoldenFile(), TestGormLoggerTrace(), TestListOKShape(), TestOKEnvelopeShape(), TestReadyz() (+3 more)

### Community 150 - "check-migrations.mjs"
Cohesion: 0.29
Nodes (12): [command = "check", argument], digest(), fail(), files, lint(), manifestPath, migrationFiles(), pathOf() (+4 more)

### Community 152 - "main"
Cohesion: 0.17
Nodes (11): net/http.HandlerFunc, frontendError, serviceStatus, AggregateDocs(), ScalarHandlers(), TestScalarPageHasExecutableCSPAndSRI(), StatusPage(), FrontendErrors() (+3 more)

### Community 153 - "Onboarding Guide"
Cohesion: 0.18
Nodes (10): Backlog: Developer Experience, Onboarding Guide, Dev/Lab/UAT/Demo/Prod Environments, Local Gate Pipeline (mirrors CI), PR Checklist, infra/compose.base.yml, compose.lab.yml (Lab Overlay), infra/compose.observability.yml (+2 more)

### Community 154 - "StartRedis"
Cohesion: 0.19
Nodes (10): TestDistributedLockOwnershipAndRenewal(), TestLeaderElectionAllowsOneActiveLeader(), TestSchedulerSingleRunnerAndPanicSafety(), TestUserLifecycleTransitions(), ValidateUserTransition(), StartRedis(), UserStatus, TestIdempotencyReplaysSuccessfulResponse() (+2 more)

### Community 155 - "Publish"
Cohesion: 0.17
Nodes (15): MFAEnrollment, DecryptForSubject(), DeriveKey(), EncryptForSubject(), KeyedDigest(), VerifyDigest(), TestSecurityPrimitives(), TestStreamMessageSigningAndEncryption() (+7 more)

### Community 156 - "StartPostgres"
Cohesion: 0.18
Nodes (9): io/fs.FS, dockerAvailable(), requireDocker(), StartPostgres(), AssertMigrationRoundTrip(), TestMigrationsAreReversibleAndIdempotent(), TestMigrationsAreReversibleAndIdempotent(), TestMigrationsAreReversibleAndIdempotent() (+1 more)

### Community 157 - "Service"
Cohesion: 0.12
Nodes (20): testing.F, ListCursor, ListFilters, StreamPublisher, ErrNotFound(), RegistrationDay, UserStats, estimateEligible() (+12 more)

### Community 159 - "Data and migration operations"
Cohesion: 0.18
Nodes (10): Backfills and seeds, Backup, PITR, masking, and recovery, Data and migration operations, Growth, archive, and purge, Index, integrity, and vacuum operations, Query review and budgets, Required migration workflow, Rollback playbook (+2 more)

### Community 162 - "NewRequestValidator"
Cohesion: 0.31
Nodes (6): github.com/getkin/kin-openapi/routers.Router, RequestValidator, NewRequestValidator(), TestRequestValidatorAcceptsRegisterBody(), TestRequestValidatorPreservesBodyLimitError(), TestRequestValidatorRejectsUndeclaredBody()

### Community 164 - "Testing & QA"
Cohesion: 0.25
Nodes (7): Commands, Conditional tools, Coverage policy, Mutation testing spike, Requirement evidence, Test naming and data, Testing & QA

### Community 165 - "Audit"
Cohesion: 0.20
Nodes (7): sync.Mutex, Audit(), Loggerish, AuditEvent, qaPublisher, userAuditPublisher, Loggerish

### Community 166 - "users/gen/gen.go"
Cohesion: 0.14
Nodes (19): ResizeAvatarMultipartBody, ResizeAvatarMultipartRequestBody, RoleSummary, UserStats, github.com/oapi-codegen/runtime/types.Date, github.com/oapi-codegen/runtime/types.File, chi.Router, ChiServerOptions (+11 more)

### Community 167 - "Handlers"
Cohesion: 0.10
Nodes (12): ctxKeyEmail, ctxKeyPerms, AuthorizeResource(), FuzzHandlerDecode(), Handlers, Service, validator.Validate, NewHandlers() (+4 more)

### Community 175 - "auth/internal/jwt.go"
Cohesion: 0.35
Nodes (10): Claims, jwt.RegisteredClaims, mint(), MintAccess(), MintAccessWithRing(), MintReset(), MintResetWithRing(), mintWithRing() (+2 more)

### Community 176 - "LoadDotEnv"
Cohesion: 0.24
Nodes (8): LoadDotEnv(), loadSecretFiles(), MustParseEnv(), TestLoadDotEnv(), TestSecretFileEnvAdapterIgnoresOptionalAppEnvFile(), envGet(), writeFile(), T

### Community 177 - "Recoverer"
Cohesion: 0.28
Nodes (7): InitErrorReporter(), ReportError(), toError(), Recoverer(), TestRecoverer(), ErrorReporter, noopReporter

### Community 181 - "main"
Cohesion: 0.18
Nodes (10): redis.Client, NewScheduler(), RecordHousekeeping(), Scheduler, AuditViewer(), closeDB(), envFile(), main() (+2 more)

### Community 182 - "ParseAccessTokenRing"
Cohesion: 0.39
Nodes (7): jwt.RegisteredClaims, ParseAccessToken(), ParseAccessTokenRing(), ParseSigningKeys(), AccessClaims, SigningKeys, ParseAccess()

### Community 184 - "check-contracts.mjs"
Cohesion: 0.29
Nodes (5): calls, failures, generated, root, spec

### Community 185 - "RequireSessionIdentity"
Cohesion: 0.33
Nodes (5): ErrForbidden(), SecretMatch(), RequireSessionIdentity(), withAuthScope(), IdentityMiddleware()

### Community 186 - "openapi-fuzz.mjs"
Cohesion: 0.40
Nodes (4): base, crashes, payloads, spec

### Community 187 - "TestDatabaseTimeoutsPreserveDSN"
Cohesion: 0.40
Nodes (3): FeatureEnabled(), TestDatabaseTimeoutsPreserveDSN(), TestFeatureEnabled()

### Community 188 - "NewLogger"
Cohesion: 0.18
Nodes (12): log/slog.Attr, log/slog.Handler, log/slog.Level, log/slog.LevelVar, log/slog.Record, levelName(), maskPII(), NewLogger() (+4 more)

### Community 189 - "ProxyHandler"
Cohesion: 0.33
Nodes (7): ProxyDeps, HasPerm(), clearIdentity(), redis.Client, LoadSpecs(), primaryEndpoint(), ProxyHandler()

### Community 193 - "time.Duration"
Cohesion: 0.15
Nodes (11): time.Duration, redis.Client, NewLeaderElector(), redis.Client, TryDistributedLock(), readSlowRequestThreshold(), SetSlowRequestThreshold(), DistributedLock (+3 more)

### Community 196 - "gorm.io/gorm.DB"
Cohesion: 0.16
Nodes (15): gorm.io/gorm.DB, UserCreatedEvent, ScheduledEvent, UserDeletedEvent, AssignDefaultRole(), ConsumeUserEvents(), redis.Client, ConsumeUserEvents() (+7 more)

### Community 197 - "Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md

### Community 198 - "SpecRouteTable"
Cohesion: 0.20
Nodes (9): net/url.URL, IsValid(), MustValid(), TestDynamicRoutingConfiguration(), TestMiddlewareRegistryHonorsConfiguredOrder(), TestSpecRouteExtensions(), ParseConsumerQuotas(), ParseWebSocketRoutes() (+1 more)

### Community 200 - "newRBACFixture"
Cohesion: 0.48
Nodes (6): qaLogger, newRBACFixture(), roleBuilder(), TestAssignDefaultRoleIsIdempotent(), TestPermissionAndRoleAssignmentIntegration(), TestSeedCatalogIsVersionedAndIdempotent()

### Community 201 - "DoD Evidence Checklist"
Cohesion: 0.40
Nodes (5): Ops Files Per Component, Web Micro-frontend Federation, Spec-to-Typed-Client Pipeline, DoD Evidence Checklist, .github/workflows/ci.yml

### Community 203 - "Architecture & scalability engineering"
Cohesion: 0.33
Nodes (5): Architecture & scalability engineering, Contracts, data flow, and projections, Edge and infrastructure, Extension points and services, Fitness gates

### Community 204 - "ResizeAvatar"
Cohesion: 0.47
Nodes (5): image/color.Color, io.Reader, blendWhite(), platformBadAvatar(), ResizeAvatar()

### Community 205 - "Schema governance audit"
Cohesion: 0.33
Nodes (5): ck_/fk_/uq_ naming exceptions (0), Columns without comments (0), Required columns without defaults (26), Schema governance audit, Time columns not using TIMESTAMPTZ (0)

### Community 208 - "check-template-drift.mjs"
Cohesion: 0.33
Nodes (5): contractServices, missing, required, root, servicesDir

### Community 210 - "Q: Implement all Engineering items in Architecture & Scalability from docs/BACKLOG.md"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in Architecture & Scalability from docs/BACKLOG.md, Source Nodes

### Community 211 - "check-architecture.mjs"
Cohesion: 0.40
Nodes (3): root, servicesRoot, violations

### Community 212 - "Profile"
Cohesion: 0.22
Nodes (8): ForgotInput, LoginInput, Profile, ProfileInput, ProfileStatus, RegisterInput, github.com/oapi-codegen/runtime/types.Email, RoleSummary

### Community 213 - "MiddlewareRegistry"
Cohesion: 0.60
Nodes (3): Middleware, MiddlewareRegistry, NewMiddlewareRegistry()

### Community 214 - "Q: Implement all Engineering items in the Data & Migrations backlog"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in the Data & Migrations backlog, Source Nodes

### Community 215 - "RunBackfill"
Cohesion: 0.50
Nodes (3): RunBackfill(), TestRunBackfillRejectsInvalidCount(), TestRunBackfillStopsAfterPartialBatch()

### Community 216 - "Fail"
Cohesion: 0.40
Nodes (5): Fail(), WriteJSON(), TestFailEnvelopeShape(), failEnvelope, okEnvelope

### Community 225 - "RequiredHeaderError"
Cohesion: 0.17
Nodes (3): RequiredHeaderError, UnescapedCookieParamError, UnmarshalingParamError

### Community 231 - "NewGormLogger"
Cohesion: 0.29
Nodes (6): gorm.io/gorm/logger.Interface, gorm.io/gorm/logger.LogLevel, NewGormLogger(), TestPostgresHarnessBootsAndServesQueries(), TestRedisHarnessBootsAndServesLocks(), newSilentGormLogger()

### Community 232 - "debugRequest"
Cohesion: 0.47
Nodes (5): DebugRequest(), debugRequest(), TestDebugRequestRejectsInvalidToken(), TestDebugRequestRequiresOperatorToken(), TestRuntimeProcessAndBuildCollectorsAreRegistered()

## Knowledge Gaps
- **744 isolated node(s):** `Change`, `SQL / migration review`, `Required migration workflow`, `Rollback playbook`, `Schema standards` (+739 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `Publish` to `Contracts Pipeline (spec-first)`, `net/http.Request`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Deprecation Mechanics (RFC-9745)` connect `Contracts Pipeline (spec-first)` to `Publish`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `Contracts Pipeline (spec-first)` connect `Contracts Pipeline (spec-first)` to `ARCHITECTURE overview`, `DoD Evidence Checklist`, `Security Posture`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `Change`, `SQL / migration review`, `Required migration workflow` to the rest of the system?**
  _744 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `testing.T` be split into smaller, more focused modules?**
  _Cohesion score 0.13015873015873017 - nodes in this community are weakly interconnected._
- **Should `context.Context` be split into smaller, more focused modules?**
  _Cohesion score 0.11623376623376623 - nodes in this community are weakly interconnected._
- **Should `net/http.Request` be split into smaller, more focused modules?**
  _Cohesion score 0.056886898096304594 - nodes in this community are weakly interconnected._