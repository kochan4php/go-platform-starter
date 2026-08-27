# Graph Report - go-platform-starter  (2026-08-27)

## Corpus Check
- 236 files · ~128,061 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2004 nodes · 3553 edges · 163 communities (120 shown, 43 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 140 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1baab8ec`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- testing.T
- Service
- net/http.Request
- nav-config.tsx
- devDependencies
- index.tsx
- devDependencies
- LoginPage.tsx
- auth service (base mesh)
- ui/package.json
- App.tsx
- main
- Service
- UsersPage.tsx
- biome.json
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
- WriteError
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- Consumer
- ErrBadRequest
- dev-all.sh
- auth-context.tsx
- users/gen/gen.go
- Publish
- web (host shell) Docker Compose Service
- contracts/package.json
- dependencies
- devDependencies
- ADR-0001: Fresh-build Pivot
- go-platform-starter README Overview
- dependencies
- devDependencies
- RemoteErrorBoundary.tsx
- resilience-drill.sh
- BACKLOG (1.202 improvement items)
- compilerOptions
- RBAC permission/role catalog API
- Contracts Pipeline (spec-first)
- Security Posture
- mailer.go
- RolesPage.tsx
- /graphify Skill Command
- Onboarding Guide
- e2e-mesh.sh
- template-service Deployment
- web-admin-users/package.json
- renovate.json
- deploy.sh
- Recoverer
- remotes.d.ts
- ServerInterfaceWrapper
- gorm.io/gorm.DB
- log/slog.Logger
- startFixture
- time.Time
- main
- ARCHITECTURE overview
- .Me
- rbac Deployment
- users Deployment
- scripts
- Handlers
- Profile
- gen.d.ts
- check-deps.mjs
- template docker-compose app service
- Audit
- MockIntersectionObserver
- MockIntersectionObserver
- web/package.json
- Perf Smoke Baseline Through Gateway
- MockIntersectionObserver
- InvalidParamFormatError
- time.Duration
- compose-specs.mjs
- golangci-lint Configuration
- check-budget.mjs
- realtime Deployment
- auth/internal/jwt.go
- rbac/internal/migrate.go
- web/vite.config.ts
- composespec/main.go
- graphify reference: extra exports and benchmark
- auth/internal/handlers.go
- RequiredHeaderError
- UnescapedCookieParamError
- DoD Evidence Checklist
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- users/internal/migrate.go
- graphify reference: GitHub clone and cross-repo merge
- @tailwindcss/vite
- @types/react-dom
- typescript
- @vitejs/plugin-react
- vitest
- config-entrypoint.sh
- chi.Router
- graphify reference: transcribe video and audio
- @testing-library/react
- @types/react
- @types/react-dom
- vitest
- otel-collector service
- deploy-demo.sh
- deploy-uat.sh
- compose.prod.yml (Production Stack)
- github.com/kochan4php/go-platform-starter
- pnpm workspace config (apps/*, packages/*)
- UnmarshalingParamError
- AGENTS.md
- browser.ts
- extraction-spec.md
- .Kick
- RequiredHeaderError
- NewGormLogger
- UnescapedCookieParamError
- UnmarshalingParamError
- context.Context
- @tailwindcss/vite
- Publisher
- MiddlewareFunc
- Loggerish
- terser

## God Nodes (most connected - your core abstractions)
1. `WriteError()` - 40 edges
2. `OK()` - 39 edges
3. `Service` - 32 edges
4. `Handlers` - 25 edges
5. `UsersPage()` - 22 edges
6. `Service` - 21 edges
7. `useToast()` - 20 edges
8. `ServerInterfaceWrapper` - 20 edges
9. `main()` - 20 edges
10. `BACKLOG (1.202 improvement items)` - 19 edges

## Surprising Connections (you probably didn't know these)
- `User Taste Profile` --semantically_similar_to--> `CI: web job (lint/test/build/budget)`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → .github/workflows/ci.yml
- `User Taste Profile` --semantically_similar_to--> `docs/BACKLOG.md Improvement Backlog`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `User Taste Profile` --semantically_similar_to--> `Host Bundle-Size Budget Gate`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `Graphify Skill-Trigger Directive` --semantically_similar_to--> `Root CLAUDE.md graphify Project Instructions`  [INFERRED] [semantically similar]
  .claude/CLAUDE.md → CLAUDE.md
- `Deprecation Mechanics (RFC-9745)` --references--> `Deprecation()`  [EXTRACTED]
  docs/API_VERSIONING.md → internal/platform/security.go

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

## Communities (163 total, 43 thin omitted)

### Community 0 - "testing.T"
Cohesion: 0.05
Nodes (67): envelope, proc, github.com/coder/websocket.Conn, net/http/httptest.Server, net/http.Response, os/exec.Cmd, testing.T, capturedEvent (+59 more)

### Community 1 - "Service"
Cohesion: 0.11
Nodes (17): AuthResult, Session, sessionView, User, RequireSessionIdentity(), withAuthScope(), sha256Hex(), findUserByEmail() (+9 more)

### Community 2 - "net/http.Request"
Cohesion: 0.07
Nodes (12): ServerInterfaceWrapper, Unimplemented, net/http.Request, net/http.ResponseWriter, Healthz(), ServerInterfaceWrapper, Unimplemented, MiddlewareFunc (+4 more)

### Community 3 - "nav-config.tsx"
Cohesion: 0.10
Nodes (15): CommandPalette(), CommandPaletteProps, fuzzy(), PaletteItem, MobileBottomNav(), mobileLabel(), ALL_NAV_ITEMS, APP_VERSION (+7 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui, @tanstack/react-query, devDependencies (+39 more)

### Community 5 - "index.tsx"
Cohesion: 0.07
Nodes (39): el, qc, el, qc, deleteMock, getMock, HealthState, Probe() (+31 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, react, react-dom, @starter/contracts, @starter/ui, devDependencies, jsdom, msw (+39 more)

### Community 7 - "LoginPage.tsx"
Cohesion: 0.11
Nodes (28): api, forgot(), login(), LoginResult, readMessage(), register(), reset(), AuthFrame() (+20 more)

### Community 8 - "auth service (base mesh)"
Cohesion: 0.10
Nodes (37): auth service (base mesh), gateway service (base mesh), postgres service (base mesh), rbac service (base mesh), realtime service (base mesh), redis service (base mesh), users service (base mesh), web (shell) service (base mesh) (+29 more)

### Community 9 - "ui/package.json"
Cohesion: 0.06
Nodes (35): description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react, @types/react-dom (+27 more)

### Community 10 - "App.tsx"
Cohesion: 0.10
Nodes (20): App(), AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), LoginPage, LoginResult, NotFoundPage() (+12 more)

### Community 11 - "main"
Cohesion: 0.07
Nodes (36): ctxKeyAuth, net/http.HandlerFunc, AccessClaims, Matcher, Fail(), WriteJSON(), All(), IsValid() (+28 more)

### Community 13 - "UsersPage.tsx"
Cohesion: 0.09
Nodes (33): ActivityFeed(), ActivityItem, ColumnKey, columnLabel(), copyText(), csvCell(), dateBoundary(), DEFAULT_COLUMNS (+25 more)

### Community 14 - "biome.json"
Cohesion: 0.07
Nodes (29): files, ignore, enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript (+21 more)

### Community 15 - "middleware.go"
Cohesion: 0.14
Nodes (15): chi.Context, net/http.Header, chiRouteContext(), CorrelationID(), InjectTraceHeaders(), LoggerFromContext(), newRequestID(), Observe() (+7 more)

### Community 16 - "DashboardShell.tsx"
Cohesion: 0.10
Nodes (21): Root(), applyTheme(), useGatewayHealth(), useTheme(), OfflineBanner(), SessionExpiringBanner(), DashboardShellContent(), NavItem (+13 more)

### Community 17 - "auth service API (OpenAPI doc)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "Service"
Cohesion: 0.14
Nodes (18): Claims, Loggerish, Publisher, Role, RoleInput, Service, userRole, bumpVerTx() (+10 more)

### Community 19 - "Client"
Cohesion: 0.09
Nodes (21): sync.Mutex, Hub, Client, jwt.RegisteredClaims, ParseAccessToken(), AccessClaims, prometheusGauge, config (+13 more)

### Community 20 - "_template/gen/gen.go"
Cohesion: 0.18
Nodes (13): chi.Router, ChiServerOptions, EnvelopeOK, InvalidParamFormatError, MiddlewareFunc, RequiredParamError, ServerInterface, TooManyValuesForParamError (+5 more)

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "auth/gen/gen.go"
Cohesion: 0.06
Nodes (30): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, AdminSetUserStateJSONBody, AdminSetUserStateJSONBodyStatus, AdminSetUserStateJSONRequestBody, ConfirmPasswordJSONBody, ConfirmPasswordJSONRequestBody, ForgotInput (+22 more)

### Community 23 - "scripts"
Cohesion: 0.08
Nodes (23): @biomejs/biome, devDependencies, @biomejs/biome, js-yaml, @playwright/test, engines, node, js-yaml (+15 more)

### Community 24 - "net/http.Handler"
Cohesion: 0.13
Nodes (21): chi.Router, ChiServerOptions, CreatePermissionJSONBody, CreatePermissionJSONRequestBody, EnvelopeFail, EnvelopeMeta, EnvelopeOK, MiddlewareFunc (+13 more)

### Community 25 - "WriteError"
Cohesion: 0.15
Nodes (6): Handlers, OK(), WriteError(), clientIP(), Handlers, validator.Validate

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
Cohesion: 0.19
Nodes (6): Consumer, redis.Client, hostnameConsumer(), NewConsumer(), osHostname(), osPid()

### Community 31 - "ErrBadRequest"
Cohesion: 0.23
Nodes (8): ErrBadRequest(), ErrConflict(), ErrForbidden(), ErrInternal(), ErrNotFound(), ErrUnauthorized(), AppError, ErrConflictEmail()

### Community 32 - "dev-all.sh"
Cohesion: 0.15
Nodes (22): ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra(), DATABASE_URL, die(), docker_publishes() (+14 more)

### Community 33 - "auth-context.tsx"
Cohesion: 0.13
Nodes (17): api, handleLoggedIn(), AuthContext, AuthProvider(), AuthState, SessionUser, ApiClient, createApiClient() (+9 more)

### Community 34 - "users/gen/gen.go"
Cohesion: 0.06
Nodes (28): ListUsersParamsLimit, ListUsersParamsOrder, ListUsersParamsPresence, ListUsersParamsSort, Profile, ProfileStatus, RoleSummary, UserStats (+20 more)

### Community 35 - "Publish"
Cohesion: 0.22
Nodes (6): redis.Client, Publish(), RedisPublisher, redis.Client, RedisPublisher, redis.Client

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

### Community 40 - "ADR-0001: Fresh-build Pivot"
Cohesion: 0.15
Nodes (17): ADR-0001: Fresh-build Pivot, GORM Replaces sqlc/pgx-direct, Schema-per-Service Decision, Redis Streams Event Backbone, Schema-per-Service Data Ownership, Backlog: Architecture & Scalability, Backlog: Data & Migrations, Backlog: Docs & Governance (+9 more)

### Community 41 - "go-platform-starter README Overview"
Cohesion: 0.19
Nodes (16): User Taste Profile, CI: commitlint job, CI: go job (lint/build/test/contracts), CI: playwright smoke job, CI: security (Trivy + Semgrep) job, CI: web job (lint/test/build/budget), CI Workflow, release-please job (+8 more)

### Community 42 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @phosphor-icons/react, react, react-dom, react-router-dom, @starter/contracts, @starter/ui, @tanstack/react-query (+7 more)

### Community 43 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 44 - "RemoteErrorBoundary.tsx"
Cohesion: 0.25
Nodes (5): CopyErrorButton(), Props, RemoteErrorBoundary, State, useCopy()

### Community 45 - "resilience-drill.sh"
Cohesion: 0.22
Nodes (8): v6 Definition of Done, Hardening Extras Found During Execution, DoD Wave Gates (0-7), DRILL_DSN, DRILL_REDIS, E2E_ADMIN_PASSWORD, resilience-drill.sh script, start_auth()

### Community 46 - "BACKLOG (1.202 improvement items)"
Cohesion: 0.14
Nodes (14): BACKLOG (1.202 improvement items), Backlog: CI/CD & Release, Backlog: Frontend Engineering, Backlog: Infra & Ops, Backlog: Performance, Backlog: Product / Roadmap, Backlog: Testing & QA, Backlog: UI/UX Login, Register & Auth (+6 more)

### Community 47 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+5 more)

### Community 48 - "RBAC permission/role catalog API"
Cohesion: 0.14
Nodes (14): rbac codegen config, RBAC permission/role catalog API, resolveClaims internal endpoint, realtimeInfo endpoint (ws url/protocol), users codegen config, users Profile CRUD API, worker Deployment, worker HorizontalPodAutoscaler (+6 more)

### Community 49 - "Contracts Pipeline (spec-first)"
Cohesion: 0.22
Nodes (11): Spec-First Without a Behavioral Contract, API Versioning Policy, Deprecation Mechanics (RFC-9745), /api/v1 Frozen Contract, Adding v2 API Strategy, Backlog: API & Contracts, Contracts Pipeline (spec-first), OpenAPI Spec as Source of Truth (+3 more)

### Community 50 - "Security Posture"
Cohesion: 0.21
Nodes (11): Backlog: Security, Identity-Header Contract, Security Posture, CSRF Mitigation by Construction, Security Headers Policy, Security Scanning (gosec/Trivy/semgrep), Secrets Management, Token Storage Policy (+3 more)

### Community 51 - "mailer.go"
Cohesion: 0.23
Nodes (9): net/smtp.Auth, BuildMIME(), Mail, Mailer, NewMailer(), TestBuildMIME(), ConsoleMailer, SMTPConfig (+1 more)

### Community 52 - "RolesPage.tsx"
Cohesion: 0.05
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
Cohesion: 0.40
Nodes (8): compose(), die(), docker_publishes(), ensure_docker(), log(), pick(), resolve_lab_ports(), deploy.sh script

### Community 60 - "Recoverer"
Cohesion: 0.24
Nodes (8): InitErrorReporter(), ReportError(), toError(), Recoverer(), TestRecoverer(), ErrorReporter, noopReporter, sentryReporter

### Community 61 - "remotes.d.ts"
Cohesion: 0.22
Nodes (7): Document, web_admin_roles/RolesPage, web_admin_users/UsersPage, web_auth/ForgotPage, web_auth/LoginPage, web_auth/RegisterPage, web_auth/ResetPage

### Community 63 - "gorm.io/gorm.DB"
Cohesion: 0.17
Nodes (16): gorm.io/gorm.DB, LoadDotEnv(), MustParseEnv(), SweepSessions(), lowerEnv(), main(), pingDB(), seedAdmin() (+8 more)

### Community 64 - "log/slog.Logger"
Cohesion: 0.10
Nodes (21): go.opentelemetry.io/otel/sdk/resource.Resource, log/slog.Logger, NewLogger(), chi.Router, NewRouter(), GracefulRun(), InitTracer(), newResource() (+13 more)

### Community 65 - "startFixture"
Cohesion: 0.28
Nodes (14): recordingMailer, closeDB(), fixture, redis.Client, openDB(), publish(), retryUntil(), startFixture() (+6 more)

### Community 66 - "time.Time"
Cohesion: 0.25
Nodes (6): Permission, Role, Session, time.Time, PermissionInfo, permissionRow

### Community 67 - "main"
Cohesion: 0.21
Nodes (11): MigrateUp(), migrationURL(), trimScheme(), AuditViewer(), closeDB(), envFile(), redis.Client, main() (+3 more)

### Community 68 - "ARCHITECTURE overview"
Cohesion: 0.29
Nodes (7): ARCHITECTURE overview, Fail-Closed Route Registry, Gateway Topology, JWT Verified Once At Edge, Observability Flow, Backlog: Observability, Realtime Connections Autoscaling Math

### Community 69 - ".Me"
Cohesion: 0.29
Nodes (5): ctxKeyEmail, EmailFromContext(), ctxKeySub, IdentityMiddleware(), SubFromContext()

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
Nodes (8): ListOK(), profileInput, listData, Meta, Handlers, Service, validator.Validate, NewHandlers()

### Community 74 - "Profile"
Cohesion: 0.33
Nodes (4): Profile, RoleSummary, Config, RoleSummary

### Community 75 - "gen.d.ts"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 76 - "check-deps.mjs"
Cohesion: 0.33
Nodes (4): exts, nodeBuiltins, root, violations

### Community 77 - "template docker-compose app service"
Cohesion: 0.33
Nodes (6): template docker-compose postgres service, template docker-compose redis service, template docker-compose app service, auth docker-compose app service, auth docker-compose postgres service, auth docker-compose redis service

### Community 78 - "Audit"
Cohesion: 0.47
Nodes (5): Audit(), Loggerish, StreamPublisher, AuditEvent, Loggerish

### Community 81 - "web/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 85 - "time.Duration"
Cohesion: 0.14
Nodes (12): net/http.Client, sync.RWMutex, time.Duration, cachedClaims, ClaimsClient, readSlowRequestThreshold(), SetSlowRequestThreshold(), redis.Client (+4 more)

### Community 86 - "compose-specs.mjs"
Cohesion: 0.40
Nodes (4): merged, outDir, root, servicesDir

### Community 87 - "golangci-lint Configuration"
Cohesion: 0.67
Nodes (4): golangci-lint Configuration, depguard rule: shared code must not import services, depguard rule: testutil must not import services, Single go.mod / Compiler-Enforced Service Isolation

### Community 88 - "check-budget.mjs"
Cohesion: 0.50
Nodes (3): budget, dist, kb

### Community 89 - "realtime Deployment"
Cohesion: 0.50
Nodes (4): realtime Deployment, realtime HorizontalPodAutoscaler, realtime PodDisruptionBudget, realtime Service

### Community 90 - "auth/internal/jwt.go"
Cohesion: 0.29
Nodes (8): Claims, jwt.RegisteredClaims, mint(), MintAccess(), MintReset(), ParseToken(), randomToken(), RandomPassword()

### Community 91 - "rbac/internal/migrate.go"
Cohesion: 0.47
Nodes (4): migrateUp(), migrationURL(), trimScheme(), MigrateUp()

### Community 94 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 95 - "auth/internal/handlers.go"
Cohesion: 0.16
Nodes (12): ctxKeyHash, forgotInput, loginInput, registerInput, resetInput, currentRefreshHash(), Config, ctxKeySub (+4 more)

### Community 98 - "DoD Evidence Checklist"
Cohesion: 0.33
Nodes (6): Ops Files Per Component, Deliberately Avoided Versioning Practices, Web Micro-frontend Federation, Spec-to-Typed-Client Pipeline, DoD Evidence Checklist, .github/workflows/ci.yml

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

### Community 103 - "users/internal/migrate.go"
Cohesion: 0.47
Nodes (4): migrateUp(), migrationURL(), trimScheme(), MigrateUp()

### Community 154 - "NewGormLogger"
Cohesion: 0.50
Nodes (4): gorm.io/gorm/logger.Interface, gorm.io/gorm/logger.LogLevel, NewGormLogger(), newSilentGormLogger()

### Community 157 - "context.Context"
Cohesion: 0.15
Nodes (13): context.Context, ListFilters, RegistrationDay, UserStats, GormLogger, Profile, redis.Client, PurgeDeletedProfiles() (+5 more)

## Knowledge Gaps
- **552 isolated node(s):** `getMock`, `postMock`, `patchMock`, `deleteMock`, `putMock` (+547 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `Contracts Pipeline (spec-first)` to `Security Posture`, `net/http.Request`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `Contracts Pipeline (spec-first)` connect `Contracts Pipeline (spec-first)` to `Security Posture`, `BACKLOG (1.202 improvement items)`, `DoD Evidence Checklist`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `getMock`, `postMock`, `patchMock` to the rest of the system?**
  _552 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `testing.T` be split into smaller, more focused modules?**
  _Cohesion score 0.05246913580246913 - nodes in this community are weakly interconnected._
- **Should `Service` be split into smaller, more focused modules?**
  _Cohesion score 0.10975609756097561 - nodes in this community are weakly interconnected._
- **Should `net/http.Request` be split into smaller, more focused modules?**
  _Cohesion score 0.07394366197183098 - nodes in this community are weakly interconnected._
- **Should `nav-config.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._