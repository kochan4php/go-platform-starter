# Graph Report - go-platform-starter  (2026-08-29)

## Corpus Check
- 312 files · ~161,328 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2446 nodes · 4576 edges · 207 communities (149 shown, 58 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 224 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c92ab5eb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- newFixture
- Service
- net/http.Request
- GormLogger
- devDependencies
- ui.tsx
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
- time.Time
- dev-all.sh
- RolesPage.test.tsx
- On-call alert runbook
- RedisPublisher
- web (host shell) Docker Compose Service
- contracts/package.json
- dependencies
- devDependencies
- ARCHITECTURE overview
- go-platform-starter README Overview
- dependencies
- devDependencies
- users/internal/handlers.go
- resilience-drill.sh
- BACKLOG (1.202 improvement items)
- compilerOptions
- RBAC permission/role catalog API
- Contracts Pipeline (spec-first)
- Security Posture
- main
- index.tsx
- /graphify Skill Command
- Onboarding Guide
- e2e-mesh.sh
- template-service Deployment
- web-admin-users/package.json
- renovate.json
- deploy.sh
- .ListUsers
- remotes.d.ts
- index.ts
- LoadDotEnv
- mailer.go
- main.tsx
- ADR-0001: Fresh-build Pivot
- main
- e2e_test.go
- Security policy
- rbac Deployment
- users Deployment
- scripts
- Handlers
- DoD Evidence Checklist
- gen.d.ts
- check-deps.mjs
- template docker-compose app service
- log/slog.Logger
- MockIntersectionObserver
- MockIntersectionObserver
- web/package.json
- main
- MockIntersectionObserver
- Recoverer
- time.Duration
- compose-specs.mjs
- golangci-lint Configuration
- check-budget.mjs
- realtime Deployment
- .validatePasswordReplacement
- startFixture
- web/vite.config.ts
- composespec/main.go
- graphify reference: extra exports and benchmark
- Profile
- Unimplemented
- TestRoomsBroadcastDenyAndForceLogoutKick
- OpenDatabase
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- MigrateUp
- graphify reference: GitHub clone and cross-repo merge
- @tailwindcss/vite
- @types/react-dom
- typescript
- InvalidParamFormatError
- vitest
- config-entrypoint.sh
- Reliability & Resilience
- graphify reference: transcribe video and audio
- @testing-library/react
- @types/react
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
- testing.T
- AGENTS.md
- RequiredHeaderError
- extraction-spec.md
- Audit
- terser
- InitTracer
- Publish
- StartRedis
- context.Context
- @tailwindcss/vite
- rbac/internal/migrate.go
- AUTH_UX.md
- NewRequestValidator
- serveIdempotent
- gorm.io/gorm.DB
- users/gen/gen.go
- Handlers
- BREAK_GLASS.md
- PENTEST_CHECKLIST.md
- THREAT_MODEL.md
- pre-commit
- annotate-deploy.sh
- PERFORMANCE.md
- ParseAccessTokenRing
- MigrateUp
- NewLogger
- performance.js
- redis-bigkeys.sh
- main
- ProxyHandler
- K6.md
- FrontendErrors
- LoggerFromContext
- UnmarshalingParamError
- TestDatabaseTimeoutsPreserveDSN
- health.go
- ScalarHandlers
- backup.sh
- check-migration-safety.sh
- envelope.go
- restore-test.sh
- WebVitals
- fail
- platform/metrics.go
- AuditViewer
- InvalidParamFormatError
- RequiredHeaderError
- UnescapedCookieParamError
- @vitejs/plugin-react
- Hub
- chi.Router
- Config
- Loggerish

## God Nodes (most connected - your core abstractions)
1. `OK()` - 46 edges
2. `WriteError()` - 46 edges
3. `Service` - 44 edges
4. `Handlers` - 29 edges
5. `main()` - 27 edges
6. `main()` - 26 edges
7. `useToast()` - 25 edges
8. `ErrBadRequest()` - 25 edges
9. `ServerInterfaceWrapper` - 24 edges
10. `Consumer` - 23 edges

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

## Communities (207 total, 58 thin omitted)

### Community 0 - "newFixture"
Cohesion: 0.24
Nodes (16): capturedEvent, capturedPublisher, fixture, redis.Client, indexOf(), mustRegister(), newFixture(), resetTokenFromMail() (+8 more)

### Community 1 - "Service"
Cohesion: 0.11
Nodes (16): ClaimsClient, Config, github.com/lib/pq.StringArray, AuthResult, passwordRecord, RedisPublisher, sessionView, hashPassword() (+8 more)

### Community 2 - "net/http.Request"
Cohesion: 0.07
Nodes (12): net/http.Request, net/http.ResponseWriter, ServerInterfaceWrapper, Unimplemented, MiddlewareFunc, ServerInterfaceWrapper, MiddlewareFunc, ServerInterfaceWrapper (+4 more)

### Community 3 - "GormLogger"
Cohesion: 0.22
Nodes (4): gorm.io/gorm/logger.LogLevel, queryOperation(), slowQuerySampled(), GormLogger

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui, @tanstack/react-query, devDependencies (+39 more)

### Community 5 - "ui.tsx"
Cohesion: 0.09
Nodes (25): DeleteRoleModal(), RoleModal(), HealthState, Probe(), Theme, SessionMenu(), timezoneOptions(), ConfirmCtx (+17 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, react, react-dom, @starter/contracts, @starter/ui, devDependencies, jsdom, msw (+39 more)

### Community 7 - "auth-ui.tsx"
Cohesion: 0.08
Nodes (48): api, apiError(), AuthApiError, forgot(), login(), LoginResult, readMessage(), register() (+40 more)

### Community 8 - "auth service (base mesh)"
Cohesion: 0.10
Nodes (37): auth service (base mesh), gateway service (base mesh), postgres service (base mesh), rbac service (base mesh), realtime service (base mesh), redis service (base mesh), users service (base mesh), web (shell) service (base mesh) (+29 more)

### Community 9 - "ui/package.json"
Cohesion: 0.06
Nodes (35): description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react, @types/react-dom (+27 more)

### Community 10 - "App.tsx"
Cohesion: 0.07
Nodes (36): AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), handleLoggedIn(), handleReauthenticated(), LoginPage, LoginResult (+28 more)

### Community 11 - "Route"
Cohesion: 0.19
Nodes (9): IsValid(), MustValid(), Route, Upstreams, Config, Matcher, NewMatcher(), ParseUpstreams() (+1 more)

### Community 12 - "resilientTransport"
Cohesion: 0.15
Nodes (16): context.CancelFunc, io.ReadCloser, net/http.Response, net/http.Transport, net/url.URL, sync/atomic.Uint64, cachedResponse, cancelBody (+8 more)

### Community 13 - "UsersPage.tsx"
Cohesion: 0.09
Nodes (33): ActivityFeed(), ActivityItem, ColumnKey, columnLabel(), copyText(), csvCell(), dateBoundary(), DEFAULT_COLUMNS (+25 more)

### Community 14 - "ignore"
Cohesion: 0.06
Nodes (34): files, ignore, enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript (+26 more)

### Community 15 - "middleware.go"
Cohesion: 0.12
Nodes (19): chi.Context, chiRouteContext(), CorrelationID(), DebugRequest(), debugRequest(), Observe(), readSlowRequestThreshold(), RequestIDFromContext() (+11 more)

### Community 16 - "DashboardShell.tsx"
Cohesion: 0.05
Nodes (39): Root(), applyTheme(), useGatewayHealth(), useTheme(), OfflineBanner(), SessionExpiringBanner(), CommandPalette(), CommandPaletteProps (+31 more)

### Community 17 - "auth service API (OpenAPI doc)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "ErrBadRequest"
Cohesion: 0.10
Nodes (27): Claims, Loggerish, ErrBadRequest(), ErrConflict(), ErrForbidden(), ErrInternal(), ErrNotFound(), ErrUnauthorized() (+19 more)

### Community 19 - "Client"
Cohesion: 0.13
Nodes (11): sync.RWMutex, Client, Handlers, Hub, prometheusGauge, contains(), NewHandlers(), NewHandlersWithKeyRing() (+3 more)

### Community 20 - "_template/gen/gen.go"
Cohesion: 0.15
Nodes (14): chi.Router, ChiServerOptions, EnvelopeOK, MiddlewareFunc, RequiredParamError, ServerInterface, TooManyValuesForParamError, UnescapedCookieParamError (+6 more)

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "auth/gen/gen.go"
Cohesion: 0.06
Nodes (35): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, AdminSetUserStateJSONBody, AdminSetUserStateJSONBodyStatus, AdminSetUserStateJSONRequestBody, ChangePasswordJSONBody, ChangePasswordJSONRequestBody, ConfirmPasswordJSONBody (+27 more)

### Community 23 - "scripts"
Cohesion: 0.08
Nodes (23): @biomejs/biome, devDependencies, @biomejs/biome, js-yaml, @playwright/test, engines, node, js-yaml (+15 more)

### Community 24 - "net/http.Handler"
Cohesion: 0.13
Nodes (21): CreatePermissionJSONBody, CreatePermissionJSONRequestBody, RoleInput, SetUserRolesJSONBody, SetUserRolesJSONRequestBody, UpdateRoleJSONBody, UpdateRoleJSONRequestBody, net/http.Handler (+13 more)

### Community 25 - "OK"
Cohesion: 0.13
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
Cohesion: 0.13
Nodes (11): Consumer, redis.XMessage, allowedWebhookHost(), freshMarkers(), redis.Client, handlerName(), hostnameConsumer(), NewConsumer() (+3 more)

### Community 31 - "time.Time"
Cohesion: 0.14
Nodes (12): Permission, Role, Session, time.Time, ListCursor, ListFilters, PermissionInfo, permissionRow (+4 more)

### Community 32 - "dev-all.sh"
Cohesion: 0.15
Nodes (22): ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra(), DATABASE_URL, die(), docker_publishes() (+14 more)

### Community 33 - "RolesPage.test.tsx"
Cohesion: 0.09
Nodes (19): el, qc, deleteMock, getMock, patchMock, permissions, postMock, putMock (+11 more)

### Community 34 - "On-call alert runbook"
Cohesion: 0.05
Nodes (39): Deploy annotations, Observability, Postgres and Redis, Profiling, Run the stack, Sampling and focused debug, SLO and error budget policy, Synthetic and external uptime (+31 more)

### Community 35 - "RedisPublisher"
Cohesion: 0.28
Nodes (6): migrateUp(), migrationURL(), trimScheme(), RedisPublisher, redis.Client, MigrateUp()

### Community 36 - "web (host shell) Docker Compose Service"
Cohesion: 0.10
Nodes (20): web-admin-roles Kubernetes Deployment, web-admin-roles HorizontalPodAutoscaler, web-admin-roles Kubernetes Service, web-admin-roles Docker Compose Service, web-admin-roles Dev HTML Entry, web-admin-users Kubernetes Deployment, web-admin-users HorizontalPodAutoscaler, web-admin-users Kubernetes Service (+12 more)

### Community 37 - "contracts/package.json"
Cohesion: 0.11
Nodes (18): openapi-fetch, openapi-typescript, dependencies, openapi-fetch, description, devDependencies, js-yaml, openapi-typescript (+10 more)

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

### Community 44 - "users/internal/handlers.go"
Cohesion: 0.21
Nodes (10): testing.B, BenchmarkWriteJSON(), profileInput, decodeListCursor(), encodeListCursor(), Profile, parseIDs(), sparseProfiles() (+2 more)

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

### Community 51 - "main"
Cohesion: 0.29
Nodes (14): ctxKeyAuth, net/netip.Prefix, Fail(), redis_rate.Limiter, clientIP(), corsHandler(), edgeRateLimit(), envFile() (+6 more)

### Community 52 - "index.tsx"
Cohesion: 0.07
Nodes (34): api, PermissionInfo, Role, AuditEntry, download(), exportMatrixPng(), iconGlyphs, iconNames (+26 more)

### Community 53 - "/graphify Skill Command"
Cohesion: 0.20
Nodes (11): Graphify Skill-Trigger Directive, Add & Watch Reference Doc, Exports & Benchmark Reference Doc, Extraction Subagent Prompt Spec, GitHub Clone & Cross-Repo Merge Reference Doc, Commit Hook & CLAUDE.md Integration Reference Doc, Query/Path/Explain Reference Doc, Transcribe Video/Audio Reference Doc (+3 more)

### Community 54 - "Onboarding Guide"
Cohesion: 0.18
Nodes (10): Backlog: Developer Experience, Onboarding Guide, Dev/Lab/UAT/Demo/Prod Environments, Local Gate Pipeline (mirrors CI), PR Checklist, infra/compose.base.yml, compose.lab.yml (Lab Overlay), infra/compose.observability.yml (+2 more)

### Community 55 - "e2e-mesh.sh"
Cohesion: 0.18
Nodes (11): ACCESS_TOKEN_SECRET, APP_PUBLIC_URL, down(), E2E_ADMIN_PASSWORD, INTERNAL_SECRET, RBAC_INTERNAL_URL, REDIS_ADDR, e2e-mesh.sh script (+3 more)

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

### Community 60 - ".ListUsers"
Cohesion: 0.47
Nodes (3): ListOK(), listData, Meta

### Community 61 - "remotes.d.ts"
Cohesion: 0.20
Nodes (7): Document, web_admin_roles/RolesPage, web_admin_users/UsersPage, web_auth/ForgotPage, web_auth/LoginPage, web_auth/RegisterPage, web_auth/ResetPage

### Community 62 - "index.ts"
Cohesion: 0.10
Nodes (20): api, Props, RemoteErrorBoundary, State, addBreadcrumb(), ApiClient, Breadcrumb, breadcrumbs (+12 more)

### Community 63 - "LoadDotEnv"
Cohesion: 0.24
Nodes (8): LoadDotEnv(), loadSecretFiles(), MustParseEnv(), TestLoadDotEnv(), TestSecretFileEnvAdapterIgnoresOptionalAppEnvFile(), envGet(), writeFile(), T

### Community 64 - "mailer.go"
Cohesion: 0.22
Nodes (10): net/smtp.Auth, BuildMIME(), Mailer, NewMailer(), TestBuildMIME(), ConsoleMailer, FallbackMailer, Mail (+2 more)

### Community 65 - "main.tsx"
Cohesion: 0.23
Nodes (7): observeWebVitals(), rating(), report(), VitalName, el, worker, handlers

### Community 66 - "ADR-0001: Fresh-build Pivot"
Cohesion: 0.33
Nodes (6): ADR-0001: Fresh-build Pivot, Backlog: Architecture & Scalability, Scaling Guide, Perf Smoke Baseline Through Gateway, Sharding/Splitting Triggers, main()

### Community 67 - "main"
Cohesion: 0.18
Nodes (14): redis.Client, NewRedisClient(), WaitForRedis(), GracefulRun(), shutdownTimeout(), config, config, closeDB() (+6 more)

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
Cohesion: 0.26
Nodes (3): Handlers, Service, NewHandlers()

### Community 74 - "DoD Evidence Checklist"
Cohesion: 0.40
Nodes (5): Ops Files Per Component, Web Micro-frontend Federation, Spec-to-Typed-Client Pipeline, DoD Evidence Checklist, .github/workflows/ci.yml

### Community 75 - "gen.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 76 - "check-deps.mjs"
Cohesion: 0.33
Nodes (4): exts, nodeBuiltins, root, violations

### Community 77 - "template docker-compose app service"
Cohesion: 0.33
Nodes (6): template docker-compose postgres service, template docker-compose redis service, template docker-compose app service, auth docker-compose app service, auth docker-compose postgres service, auth docker-compose redis service

### Community 78 - "log/slog.Logger"
Cohesion: 0.11
Nodes (19): Checker, chi.Router, container/list.Element, container/list.List, log/slog.Logger, net/http.Client, sync.Mutex, cachedClaims (+11 more)

### Community 81 - "web/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 82 - "main"
Cohesion: 0.19
Nodes (9): SweepSessions(), RegisterSessionMetrics(), redis.Client, RateLimit(), lowerEnv(), main(), pingDB(), seedAdmin() (+1 more)

### Community 84 - "Recoverer"
Cohesion: 0.28
Nodes (7): InitErrorReporter(), ReportError(), toError(), Recoverer(), TestRecoverer(), ErrorReporter, noopReporter

### Community 85 - "time.Duration"
Cohesion: 0.25
Nodes (12): time.Duration, Config, Claims, jwt.RegisteredClaims, mint(), MintAccess(), MintAccessWithRing(), MintReset() (+4 more)

### Community 86 - "compose-specs.mjs"
Cohesion: 0.40
Nodes (4): merged, outDir, root, servicesDir

### Community 87 - "golangci-lint Configuration"
Cohesion: 0.67
Nodes (4): golangci-lint Configuration, depguard rule: shared code must not import services, depguard rule: testutil must not import services, Single go.mod / Compiler-Enforced Service Isolation

### Community 88 - "check-budget.mjs"
Cohesion: 0.40
Nodes (4): budget, chunks, dist, kb

### Community 89 - "realtime Deployment"
Cohesion: 0.50
Nodes (4): realtime Deployment, realtime HorizontalPodAutoscaler, realtime PodDisruptionBudget, realtime Service

### Community 90 - ".validatePasswordReplacement"
Cohesion: 0.18
Nodes (13): randomToken(), totpCode(), verifyTOTP(), CalibrateBcryptCost(), checkHIBP(), passwordHistoryContains(), passwordNeedsRehash(), RandomPassword() (+5 more)

### Community 91 - "startFixture"
Cohesion: 0.24
Nodes (15): recordingMailer, closeDB(), fixture, redis.Client, openDB(), publish(), retryUntil(), startFixture() (+7 more)

### Community 94 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 95 - "Profile"
Cohesion: 0.33
Nodes (4): Profile, RoleSummary, Config, RoleSummary

### Community 97 - "TestRoomsBroadcastDenyAndForceLogoutKick"
Cohesion: 0.26
Nodes (11): github.com/coder/websocket.Conn, net/http/httptest.Server, dialWS(), mint(), readMsg(), send(), TestRoomsBroadcastDenyAndForceLogoutKick(), redis.Client (+3 more)

### Community 98 - "OpenDatabase"
Cohesion: 0.42
Nodes (7): databaseTimeouts(), envBool(), envDuration(), envInt(), OpenDatabase(), TestDatabaseEnvironmentDefaultsAndOverrides(), StartPprof()

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

### Community 103 - "MigrateUp"
Cohesion: 0.83
Nodes (3): MigrateUp(), migrationURL(), trimScheme()

### Community 111 - "Reliability & Resilience"
Cohesion: 0.25
Nodes (7): Backup and disaster recovery, Deliberate non-mechanisms, Deployment safety, Multi-region readiness checklist, Reliability & Resilience, Runtime controls, Worker and DLQ operations

### Community 142 - "testing.T"
Cohesion: 0.12
Nodes (21): testing.T, discardLogger(), TestFailEnvelopeShape(), TestGormLoggerTrace(), TestListOKShape(), TestOKEnvelopeShape(), TestParsePagination(), TestReadyz() (+13 more)

### Community 152 - "Audit"
Cohesion: 0.18
Nodes (10): Audit(), Loggerish, StreamPublisher, newRequestID(), redis.Client, PublishWithAuditOutbox(), AuditEvent, Loggerish (+2 more)

### Community 154 - "InitTracer"
Cohesion: 0.22
Nodes (11): go.opentelemetry.io/otel/sdk/resource.Resource, TestTraceAndBaggageMapRoundTrip(), ExtractTraceMap(), InitTracer(), InjectTraceMap(), newResource(), TraceIDFromContext(), traceSampleRatio() (+3 more)

### Community 155 - "Publish"
Cohesion: 0.16
Nodes (16): MFAEnrollment, DecryptForSubject(), DeriveKey(), EncryptForSubject(), KeyedDigest(), VerifyDigest(), TestSecurityPrimitives(), TestStreamMessageSigningAndEncryption() (+8 more)

### Community 156 - "StartRedis"
Cohesion: 0.22
Nodes (10): gorm.io/gorm/logger.Interface, NewGormLogger(), TestSchedulerSingleRunnerAndPanicSafety(), dockerAvailable(), requireDocker(), StartPostgres(), StartRedis(), TestPostgresHarnessBootsAndServesQueries() (+2 more)

### Community 157 - "context.Context"
Cohesion: 0.12
Nodes (18): context.Context, testing.F, All(), RegistrationDay, UserStats, Hub, redis.Client, FuzzUserOrderClauseNeverIncludesInput() (+10 more)

### Community 159 - "rbac/internal/migrate.go"
Cohesion: 0.47
Nodes (4): migrateUp(), migrationURL(), trimScheme(), MigrateUp()

### Community 162 - "NewRequestValidator"
Cohesion: 0.31
Nodes (6): github.com/getkin/kin-openapi/routers.Router, RequestValidator, NewRequestValidator(), TestRequestValidatorAcceptsRegisterBody(), TestRequestValidatorPreservesBodyLimitError(), TestRequestValidatorRejectsUndeclaredBody()

### Community 164 - "serveIdempotent"
Cohesion: 0.29
Nodes (8): net/http.Header, bufferedWriter, idempotencyRecord, InjectTraceHeaders(), copyHeader(), redis.Client, requestFingerprint(), serveIdempotent()

### Community 165 - "gorm.io/gorm.DB"
Cohesion: 0.31
Nodes (8): gorm.io/gorm.DB, ConsumeUserEvents(), redis.Client, handleEvent(), PurgeDeletedProfiles(), closeDB(), main(), pingDB()

### Community 166 - "users/gen/gen.go"
Cohesion: 0.06
Nodes (29): ListUsersParamsCount, ListUsersParamsLimit, ListUsersParamsOrder, ListUsersParamsPresence, ListUsersParamsSort, Profile, ProfileStatus, RoleSummary (+21 more)

### Community 167 - "Handlers"
Cohesion: 0.13
Nodes (9): ctxKeyEmail, ctxKeyPerms, AuthorizeResource(), Handlers, validator.Validate, EmailFromContext(), ctxKeySub, PermissionsFromContext() (+1 more)

### Community 175 - "ParseAccessTokenRing"
Cohesion: 0.29
Nodes (7): jwt.RegisteredClaims, ParseAccessToken(), ParseAccessTokenRing(), ParseSigningKeys(), AccessClaims, SigningKeys, ParseAccess()

### Community 176 - "MigrateUp"
Cohesion: 0.83
Nodes (3): MigrateUp(), migrationURL(), trimScheme()

### Community 177 - "NewLogger"
Cohesion: 0.15
Nodes (15): log/slog.Attr, log/slog.Handler, log/slog.Level, log/slog.LevelVar, log/slog.Record, buildValue(), levelName(), maskPII() (+7 more)

### Community 181 - "main"
Cohesion: 0.22
Nodes (9): redis.Client, NewScheduler(), RecordHousekeeping(), Scheduler, closeDB(), envFile(), main(), pingDB() (+1 more)

### Community 182 - "ProxyHandler"
Cohesion: 0.27
Nodes (10): ProxyDeps, Matcher, RequestValidator, Route, clearIdentity(), redis.Client, Upstreams, LoadSpecs() (+2 more)

### Community 184 - "FrontendErrors"
Cohesion: 0.24
Nodes (7): net/http.HandlerFunc, frontendError, serviceStatus, Upstreams, StatusPage(), FrontendErrors(), validFrontendError()

### Community 185 - "LoggerFromContext"
Cohesion: 0.40
Nodes (5): LoggerFromContext(), SecretMatch(), RequireSessionIdentity(), withAuthScope(), IdentityMiddleware()

### Community 187 - "TestDatabaseTimeoutsPreserveDSN"
Cohesion: 0.40
Nodes (3): FeatureEnabled(), TestDatabaseTimeoutsPreserveDSN(), TestFeatureEnabled()

### Community 188 - "health.go"
Cohesion: 0.50
Nodes (4): Drain(), Healthz(), Readyz(), Checker

### Community 189 - "ScalarHandlers"
Cohesion: 0.40
Nodes (3): AggregateDocs(), ScalarHandlers(), TestScalarPageHasExecutableCSPAndSRI()

### Community 193 - "envelope.go"
Cohesion: 0.50
Nodes (3): WriteJSON(), failEnvelope, okEnvelope

## Knowledge Gaps
- **637 isolated node(s):** `Props`, `State`, `el`, `Run the stack`, `What is measured` (+632 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `Publish` to `Contracts Pipeline (spec-first)`, `net/http.Request`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Deprecation Mechanics (RFC-9745)` connect `Contracts Pipeline (spec-first)` to `Publish`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Contracts Pipeline (spec-first)` connect `Contracts Pipeline (spec-first)` to `ARCHITECTURE overview`, `Security Posture`, `DoD Evidence Checklist`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `Props`, `State`, `el` to the rest of the system?**
  _637 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Service` be split into smaller, more focused modules?**
  _Cohesion score 0.11436170212765957 - nodes in this community are weakly interconnected._
- **Should `net/http.Request` be split into smaller, more focused modules?**
  _Cohesion score 0.0669753086419753 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._