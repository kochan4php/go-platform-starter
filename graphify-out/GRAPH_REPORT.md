# Graph Report - go-platform-starter  (2026-08-29)

## Corpus Check
- 333 files · ~182,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2555 nodes · 4710 edges · 211 communities (154 shown, 57 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 229 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e66e270`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- newFixture
- context.Context
- net/http.Request
- GormLogger
- devDependencies
- index.tsx
- devDependencies
- auth-ui.tsx
- auth service (base mesh)
- ui/package.json
- App.tsx
- serveIdempotent
- resilientTransport
- UsersPage.tsx
- ignore
- middleware.go
- DashboardShell.tsx
- auth service API (OpenAPI doc)
- Service
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
- main
- dev-all.sh
- check-coverage.mjs
- On-call alert runbook
- PublishWithAuditOutbox
- web (host shell) Docker Compose Service
- contracts/package.json
- dependencies
- devDependencies
- ARCHITECTURE overview
- go-platform-starter README Overview
- dependencies
- devDependencies
- .Kick
- resilience-drill.sh
- BACKLOG (1.202 improvement items)
- compilerOptions
- RBAC permission/role catalog API
- Contracts Pipeline (spec-first)
- Security Posture
- gorm.io/gorm.DB
- RolesPage.tsx
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
- .validatePasswordReplacement
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
- contextLevelHandler
- MockIntersectionObserver
- MockIntersectionObserver
- web/package.json
- main
- MockIntersectionObserver
- testing.F
- newUsersFixture
- compose-specs.mjs
- golangci-lint Configuration
- check-budget.mjs
- realtime Deployment
- time.Time
- startFixture
- web/vite.config.ts
- composespec/main.go
- graphify reference: extra exports and benchmark
- Profile
- log/slog.Logger
- errorreporter.go
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
- auth/internal/service.go
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
- newResilientTransport
- extraction-spec.md
- AuthFrame.tsx
- terser
- debugRequest
- Publish
- StartPostgres
- ErrBadRequest
- @tailwindcss/vite
- RedisPublisher
- AUTH_UX.md
- NewRequestValidator
- Testing & QA
- NewGormLogger
- users/gen/gen.go
- Handlers
- BREAK_GLASS.md
- PENTEST_CHECKLIST.md
- THREAT_MODEL.md
- pre-commit
- annotate-deploy.sh
- PERFORMANCE.md
- time.Duration
- chiRouteContext
- envelope.go
- performance.js
- redis-bigkeys.sh
- main
- statusRecorder
- K6.md
- check-contracts.mjs
- auth/internal/handlers.go
- openapi-fuzz.mjs
- TestDatabaseTimeoutsPreserveDSN
- NewRouter
- Profile
- backup.sh
- check-migration-safety.sh
- ServerInterfaceWrapper
- restore-test.sh
- WebVitals
- fail
- Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md
- UnescapedCookieParamError
- chaos-qa.sh
- InvalidParamFormatError
- UnmarshalingParamError
- @vitejs/plugin-react
- UnescapedCookieParamError
- Config
- UnmarshalingParamError
- Profile
- Profile

## God Nodes (most connected - your core abstractions)
1. `OK()` - 47 edges
2. `WriteError()` - 46 edges
3. `Service` - 44 edges
4. `Handlers` - 29 edges
5. `main()` - 27 edges
6. `main()` - 26 edges
7. `ErrBadRequest()` - 25 edges
8. `ServerInterfaceWrapper` - 24 edges
9. `Consumer` - 22 edges
10. `main()` - 22 edges

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

## Communities (211 total, 57 thin omitted)

### Community 0 - "newFixture"
Cohesion: 0.19
Nodes (21): capturedEvent, capturedPublisher, fixture, redis.Client, indexOf(), mustRegister(), newFixture(), resetTokenFromMail() (+13 more)

### Community 1 - "context.Context"
Cohesion: 0.15
Nodes (11): ClaimsClient, context.Context, AuthResult, Audit(), Loggerish, ActiveSecret(), hashPassword(), Service (+3 more)

### Community 2 - "net/http.Request"
Cohesion: 0.06
Nodes (13): net/http.Request, net/http.ResponseWriter, Drain(), Healthz(), ServerInterfaceWrapper, Unimplemented, MiddlewareFunc, ServerInterfaceWrapper (+5 more)

### Community 3 - "GormLogger"
Cohesion: 0.28
Nodes (3): queryOperation(), slowQuerySampled(), GormLogger

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui, @tanstack/react-query, devDependencies (+39 more)

### Community 5 - "index.tsx"
Cohesion: 0.08
Nodes (44): DeleteRoleModal(), el, qc, HealthState, Probe(), Theme, CopyErrorButton(), Props (+36 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, react, react-dom, @starter/contracts, @starter/ui, devDependencies, jsdom, msw (+39 more)

### Community 7 - "auth-ui.tsx"
Cohesion: 0.09
Nodes (44): api, apiError(), AuthApiError, forgot(), login(), LoginResult, readMessage(), register() (+36 more)

### Community 8 - "auth service (base mesh)"
Cohesion: 0.10
Nodes (37): auth service (base mesh), gateway service (base mesh), postgres service (base mesh), rbac service (base mesh), realtime service (base mesh), redis service (base mesh), users service (base mesh), web (shell) service (base mesh) (+29 more)

### Community 9 - "ui/package.json"
Cohesion: 0.06
Nodes (36): jsdom, description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react (+28 more)

### Community 10 - "App.tsx"
Cohesion: 0.06
Nodes (35): AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), handleLoggedIn(), handleReauthenticated(), LoginPage, LoginResult (+27 more)

### Community 11 - "serveIdempotent"
Cohesion: 0.07
Nodes (34): net/http.Header, bufferedWriter, idempotencyRecord, jwt.RegisteredClaims, ParseAccessToken(), ParseAccessTokenRing(), ParseSigningKeys(), InjectTraceHeaders() (+26 more)

### Community 12 - "resilientTransport"
Cohesion: 0.11
Nodes (20): context.CancelFunc, io.ReadCloser, net/http.Response, net/url.URL, sync/atomic.Uint64, sync.Mutex, cachedResponse, cancelBody (+12 more)

### Community 13 - "UsersPage.tsx"
Cohesion: 0.07
Nodes (31): ActivityItem, ColumnKey, columnLabel(), copyText(), csvCell(), dateBoundary(), DEFAULT_COLUMNS, DEFAULT_WIDTHS (+23 more)

### Community 14 - "ignore"
Cohesion: 0.06
Nodes (34): files, ignore, enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript (+26 more)

### Community 15 - "middleware.go"
Cohesion: 0.20
Nodes (14): CorrelationID(), LoggerFromContext(), newRequestID(), readSlowRequestThreshold(), Recoverer(), RequestIDFromContext(), RequestLogger(), sampleAccessLog() (+6 more)

### Community 16 - "DashboardShell.tsx"
Cohesion: 0.06
Nodes (31): useGatewayHealth(), SessionExpiringBanner(), CommandPalette(), CommandPaletteProps, fuzzy(), PaletteItem, NavItem, preloadRemote() (+23 more)

### Community 17 - "auth service API (OpenAPI doc)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "Service"
Cohesion: 0.10
Nodes (23): Loggerish, PermissionInfo, All(), Role, RoleInput, userRole, Publisher, bumpVerTx() (+15 more)

### Community 19 - "Client"
Cohesion: 0.08
Nodes (24): github.com/coder/websocket.Conn, net/http/httptest.Server, sync.RWMutex, Hub, Client, InjectTraceMap(), prometheusGauge, contains() (+16 more)

### Community 20 - "_template/gen/gen.go"
Cohesion: 0.11
Nodes (16): chi.Router, ChiServerOptions, EnvelopeOK, InvalidParamFormatError, MiddlewareFunc, RequiredHeaderError, RequiredParamError, ServerInterface (+8 more)

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "auth/gen/gen.go"
Cohesion: 0.08
Nodes (27): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, AdminSetUserStateJSONBody, AdminSetUserStateJSONBodyStatus, AdminSetUserStateJSONRequestBody, ChangePasswordJSONBody, ChangePasswordJSONRequestBody, ConfirmPasswordJSONBody (+19 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (28): @axe-core/playwright, @biomejs/biome, devDependencies, @axe-core/playwright, @biomejs/biome, js-yaml, @playwright/test, engines (+20 more)

### Community 24 - "net/http.Handler"
Cohesion: 0.09
Nodes (24): CreatePermissionJSONBody, CreatePermissionJSONRequestBody, RoleInput, SetUserRolesJSONBody, SetUserRolesJSONRequestBody, UpdateRoleJSONBody, UpdateRoleJSONRequestBody, net/http.Handler (+16 more)

### Community 25 - "OK"
Cohesion: 0.18
Nodes (10): OK(), WriteError(), currentRefreshHash(), deviceID(), Config, Handlers, Service, validator.Validate (+2 more)

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
Cohesion: 0.12
Nodes (11): Consumer, redis.XMessage, allowedWebhookHost(), freshMarkers(), redis.Client, handlerName(), hostnameConsumer(), NewConsumer() (+3 more)

### Community 31 - "main"
Cohesion: 0.13
Nodes (22): ctxKeyAuth, net/http.HandlerFunc, net/netip.Prefix, frontendError, Fail(), redis_rate.Limiter, AggregateDocs(), ScalarHandlers() (+14 more)

### Community 32 - "dev-all.sh"
Cohesion: 0.15
Nodes (22): ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra(), DATABASE_URL, die(), docker_publishes() (+14 more)

### Community 33 - "check-coverage.mjs"
Cohesion: 0.11
Nodes (16): badgeDir, byPackage, changed, changedLines, changedRows, changedScore, listed, merged (+8 more)

### Community 34 - "On-call alert runbook"
Cohesion: 0.05
Nodes (39): Deploy annotations, Observability, Postgres and Redis, Profiling, Run the stack, Sampling and focused debug, SLO and error budget policy, Synthetic and external uptime (+31 more)

### Community 35 - "PublishWithAuditOutbox"
Cohesion: 0.20
Nodes (8): redis.Client, PublishWithAuditOutbox(), migrateUp(), migrationURL(), trimScheme(), RedisPublisher, redis.Client, MigrateUp()

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

### Community 51 - "gorm.io/gorm.DB"
Cohesion: 0.16
Nodes (17): go.opentelemetry.io/otel/sdk/resource.Resource, gorm.io/gorm.DB, TestTraceAndBaggageMapRoundTrip(), ExtractTraceMap(), InitTracer(), newResource(), TraceIDFromContext(), traceSampleRatio() (+9 more)

### Community 52 - "RolesPage.tsx"
Cohesion: 0.05
Nodes (36): api, PermissionInfo, Role, el, qc, AuditEntry, download(), exportMatrixPng() (+28 more)

### Community 53 - "/graphify Skill Command"
Cohesion: 0.20
Nodes (11): Graphify Skill-Trigger Directive, Add & Watch Reference Doc, Exports & Benchmark Reference Doc, Extraction Subagent Prompt Spec, GitHub Clone & Cross-Repo Merge Reference Doc, Commit Hook & CLAUDE.md Integration Reference Doc, Query/Path/Explain Reference Doc, Transcribe Video/Audio Reference Doc (+3 more)

### Community 54 - "Onboarding Guide"
Cohesion: 0.18
Nodes (10): Backlog: Developer Experience, Onboarding Guide, Dev/Lab/UAT/Demo/Prod Environments, Local Gate Pipeline (mirrors CI), PR Checklist, infra/compose.base.yml, compose.lab.yml (Lab Overlay), infra/compose.observability.yml (+2 more)

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

### Community 60 - ".ListUsers"
Cohesion: 0.47
Nodes (3): ListOK(), listData, Meta

### Community 61 - "remotes.d.ts"
Cohesion: 0.20
Nodes (7): Document, web_admin_roles/RolesPage, web_admin_users/UsersPage, web_auth/ForgotPage, web_auth/LoginPage, web_auth/RegisterPage, web_auth/ResetPage

### Community 62 - "index.ts"
Cohesion: 0.10
Nodes (26): api, useRealtimeUsers(), AuthContext, AuthProvider(), SessionUser, addBreadcrumb(), ApiClient, Breadcrumb (+18 more)

### Community 63 - ".validatePasswordReplacement"
Cohesion: 0.18
Nodes (13): randomToken(), totpCode(), verifyTOTP(), CalibrateBcryptCost(), checkHIBP(), passwordHistoryContains(), passwordNeedsRehash(), RandomPassword() (+5 more)

### Community 64 - "mailer.go"
Cohesion: 0.20
Nodes (10): net/smtp.Auth, BuildMIME(), Mail, Mailer, NewMailer(), TestBuildMIME(), ConsoleMailer, FallbackMailer (+2 more)

### Community 65 - "main.tsx"
Cohesion: 0.21
Nodes (8): App(), observeWebVitals(), rating(), report(), VitalName, el, worker, handlers

### Community 66 - "ADR-0001: Fresh-build Pivot"
Cohesion: 0.33
Nodes (6): ADR-0001: Fresh-build Pivot, Backlog: Architecture & Scalability, Scaling Guide, Perf Smoke Baseline Through Gateway, Sharding/Splitting Triggers, main()

### Community 67 - "main"
Cohesion: 0.13
Nodes (18): NewLogger(), parseLogLevel(), redis.Client, NewRedisClient(), WaitForRedis(), GracefulRun(), shutdownTimeout(), config (+10 more)

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
Cohesion: 0.19
Nodes (4): DeleteRoleParams, Handlers, Service, NewHandlers()

### Community 74 - "DoD Evidence Checklist"
Cohesion: 0.40
Nodes (5): Ops Files Per Component, Web Micro-frontend Federation, Spec-to-Typed-Client Pipeline, DoD Evidence Checklist, .github/workflows/ci.yml

### Community 75 - "gen.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 76 - "check-deps.mjs"
Cohesion: 0.40
Nodes (3): exts, nodeBuiltins, violations

### Community 77 - "template docker-compose app service"
Cohesion: 0.33
Nodes (6): template docker-compose postgres service, template docker-compose redis service, template docker-compose app service, auth docker-compose app service, auth docker-compose postgres service, auth docker-compose redis service

### Community 78 - "contextLevelHandler"
Cohesion: 0.21
Nodes (10): log/slog.Attr, log/slog.Handler, log/slog.Level, log/slog.LevelVar, log/slog.Record, levelName(), maskPII(), scrubLogAttr() (+2 more)

### Community 81 - "web/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 82 - "main"
Cohesion: 0.13
Nodes (15): LoadDotEnv(), loadSecretFiles(), MustParseEnv(), TestLoadDotEnv(), TestSecretFileEnvAdapterIgnoresOptionalAppEnvFile(), envGet(), writeFile(), SweepSessions() (+7 more)

### Community 84 - "testing.F"
Cohesion: 0.20
Nodes (8): testing.F, FuzzHandlerDecode(), FuzzUserOrderClauseNeverIncludesInput(), FuzzValidateProfileFields(), TestProfileSecurityValidation(), TestListFiltersZeroValue(), TestUserOrderClause(), userOrderClause()

### Community 85 - "newUsersFixture"
Cohesion: 0.27
Nodes (9): profileOption, userAuditPublisher, redis.Client, Service, newUsersFixture(), profileBuilder(), TestGoldenUsersFixture(), TestUsersCRUDValidationPresenceAndBoundaries() (+1 more)

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

### Community 90 - "time.Time"
Cohesion: 0.09
Nodes (22): Permission, Role, Session, testing.B, time.Time, ListCursor, ListFilters, permissionRow (+14 more)

### Community 91 - "startFixture"
Cohesion: 0.23
Nodes (17): Consumer, recordingMailer, closeDB(), fixture, redis.Client, openDB(), publish(), retryUntil() (+9 more)

### Community 94 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 95 - "Profile"
Cohesion: 0.33
Nodes (4): Profile, RoleSummary, Config, RoleSummary

### Community 96 - "log/slog.Logger"
Cohesion: 0.14
Nodes (14): container/list.Element, container/list.List, log/slog.Logger, net/http.Client, cachedClaims, claimEntry, ClaimsClient, NewClaimsClient() (+6 more)

### Community 97 - "errorreporter.go"
Cohesion: 0.28
Nodes (6): InitErrorReporter(), ReportError(), toError(), ErrorReporter, noopReporter, sentryReporter

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

### Community 108 - "auth/internal/service.go"
Cohesion: 0.32
Nodes (7): Config, github.com/lib/pq.StringArray, passwordRecord, Publisher, RedisPublisher, redis.Client, NewService()

### Community 111 - "Reliability & Resilience"
Cohesion: 0.25
Nodes (7): Backup and disaster recovery, Deliberate non-mechanisms, Deployment safety, Multi-region readiness checklist, Reliability & Resilience, Runtime controls, Worker and DLQ operations

### Community 142 - "testing.T"
Cohesion: 0.13
Nodes (20): testing.T, ParsePagination(), discardLogger(), TestEnvelopeGoldenFile(), TestFailEnvelopeShape(), TestGormLoggerTrace(), TestListOKShape(), TestOKEnvelopeShape() (+12 more)

### Community 150 - "newResilientTransport"
Cohesion: 0.25
Nodes (7): net/http.Transport, TestIdempotencyReplaysSuccessfulResponse(), TestProxyUsesValidatedClientIP(), TestResilientTransportFailsOverGET(), TestResilientTransportHedgesSlowGET(), newResilientTransport(), TestUpstreamTransportInjectsChildTraceContext()

### Community 152 - "AuthFrame.tsx"
Cohesion: 0.29
Nodes (6): AuthPage, FEATURES, PAGE, Window, BrandMark(), FooterStrip()

### Community 154 - "debugRequest"
Cohesion: 0.38
Nodes (5): DebugRequest(), debugRequest(), TestDebugRequestRejectsInvalidToken(), TestDebugRequestRequiresOperatorToken(), TestRuntimeProcessAndBuildCollectorsAreRegistered()

### Community 155 - "Publish"
Cohesion: 0.19
Nodes (14): MFAEnrollment, DecryptForSubject(), DeriveKey(), EncryptForSubject(), KeyedDigest(), VerifyDigest(), TestSecurityPrimitives(), TestStreamMessageSigningAndEncryption() (+6 more)

### Community 156 - "StartPostgres"
Cohesion: 0.13
Nodes (13): io/fs.FS, TestSchedulerSingleRunnerAndPanicSafety(), dockerAvailable(), requireDocker(), StartPostgres(), StartRedis(), TestPostgresHarnessBootsAndServesQueries(), TestRedisHarnessBootsAndServesLocks() (+5 more)

### Community 157 - "ErrBadRequest"
Cohesion: 0.10
Nodes (21): AuditEvent, StreamPublisher, ErrBadRequest(), ErrConflict(), ErrForbidden(), ErrInternal(), ErrNotFound(), ErrUnauthorized() (+13 more)

### Community 159 - "RedisPublisher"
Cohesion: 0.27
Nodes (6): migrateUp(), migrationURL(), trimScheme(), RedisPublisher, redis.Client, MigrateUp()

### Community 162 - "NewRequestValidator"
Cohesion: 0.31
Nodes (6): github.com/getkin/kin-openapi/routers.Router, RequestValidator, NewRequestValidator(), TestRequestValidatorAcceptsRegisterBody(), TestRequestValidatorPreservesBodyLimitError(), TestRequestValidatorRejectsUndeclaredBody()

### Community 164 - "Testing & QA"
Cohesion: 0.25
Nodes (7): Commands, Conditional tools, Coverage policy, Mutation testing spike, Requirement evidence, Test naming and data, Testing & QA

### Community 165 - "NewGormLogger"
Cohesion: 0.50
Nodes (4): gorm.io/gorm/logger.Interface, gorm.io/gorm/logger.LogLevel, NewGormLogger(), newSilentGormLogger()

### Community 166 - "users/gen/gen.go"
Cohesion: 0.07
Nodes (25): ListUsersParamsCount, ListUsersParamsLimit, ListUsersParamsOrder, ListUsersParamsPresence, ListUsersParamsSort, RoleSummary, UserStats, github.com/oapi-codegen/runtime/types.Date (+17 more)

### Community 167 - "Handlers"
Cohesion: 0.13
Nodes (9): ctxKeyEmail, ctxKeyPerms, AuthorizeResource(), Handlers, validator.Validate, EmailFromContext(), ctxKeySub, PermissionsFromContext() (+1 more)

### Community 175 - "time.Duration"
Cohesion: 0.25
Nodes (12): time.Duration, Config, Claims, jwt.RegisteredClaims, mint(), MintAccess(), MintAccessWithRing(), MintReset() (+4 more)

### Community 176 - "chiRouteContext"
Cohesion: 0.50
Nodes (4): chi.Context, chiRouteContext(), Observe(), Trace()

### Community 177 - "envelope.go"
Cohesion: 0.50
Nodes (3): WriteJSON(), failEnvelope, okEnvelope

### Community 181 - "main"
Cohesion: 0.17
Nodes (12): redis.Client, NewScheduler(), RecordHousekeeping(), Scheduler, MigrateUp(), migrationURL(), trimScheme(), closeDB() (+4 more)

### Community 184 - "check-contracts.mjs"
Cohesion: 0.29
Nodes (5): calls, failures, generated, root, spec

### Community 185 - "auth/internal/handlers.go"
Cohesion: 0.13
Nodes (12): ctxKeyHash, forgotInput, loginInput, SecretMatch(), registerInput, resetInput, RequireSessionIdentity(), clientIP() (+4 more)

### Community 186 - "openapi-fuzz.mjs"
Cohesion: 0.40
Nodes (4): base, crashes, payloads, spec

### Community 187 - "TestDatabaseTimeoutsPreserveDSN"
Cohesion: 0.40
Nodes (3): FeatureEnabled(), TestDatabaseTimeoutsPreserveDSN(), TestFeatureEnabled()

### Community 188 - "NewRouter"
Cohesion: 0.20
Nodes (8): buildValue(), Readyz(), recordAPIError(), recordBuildInfo(), withBaseLogger(), chi.Router, NewRouter(), Checker

### Community 189 - "Profile"
Cohesion: 0.22
Nodes (8): ForgotInput, LoginInput, Profile, ProfileInput, ProfileStatus, RegisterInput, github.com/oapi-codegen/runtime/types.Email, RoleSummary

### Community 197 - "Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md

## Knowledge Gaps
- **681 isolated node(s):** `cdnOrigin`, `getMock`, `deleteMock`, `Profile`, `ListMeta` (+676 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `ErrBadRequest` to `Contracts Pipeline (spec-first)`, `net/http.Request`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Deprecation Mechanics (RFC-9745)` connect `Contracts Pipeline (spec-first)` to `ErrBadRequest`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Contracts Pipeline (spec-first)` connect `Contracts Pipeline (spec-first)` to `ARCHITECTURE overview`, `Security Posture`, `DoD Evidence Checklist`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `cdnOrigin`, `getMock`, `deleteMock` to the rest of the system?**
  _681 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `net/http.Request` be split into smaller, more focused modules?**
  _Cohesion score 0.060424469413233456 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07539450613676213 - nodes in this community are weakly interconnected._