# Graph Report - go-platform-starter  (2026-08-27)

## Corpus Check
- 295 files · ~103,358 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1841 nodes · 3245 edges · 149 communities (114 shown, 35 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.85)
- Token cost: 476,559 input · 0 output

## Community Hubs (Navigation)
- Integration Test Harnesses
- Auth Domain & Session Service
- RBAC/Users Service Interfaces
- Dashboard Shell UI Components
- web-admin-roles Package Config
- Shared UI Providers & Page Dev Entries
- web-auth Package Config
- Auth Frontend Pages
- Compose Service Mesh Topology
- UI Package Config
- App Routing & Top-Level Pages
- Gateway Routing & Proxy
- RBAC & Users HTTP Handlers
- Users Page Table UI
- Biome Lint/Format Config
- Request Middleware & Error Reporting
- GORM Logger & Scheduler
- OpenAPI Schemas (Template/Auth/Gateway)
- RBAC Domain Model & Service
- Realtime WebSocket Hub
- Generated Chi Server (Template)
- Roles Page UI Components
- Generated Chi Server (Auth)
- Root Package Scripts & Lint
- Generated Chi Server (RBAC)
- Auth Handlers & Session Cookies
- web-admin-roles TS Config
- web-admin-users TS Config
- web-auth TS Config
- web TS Config
- Worker Stream Consumer
- Users Audit & Service
- Local Dev Launcher Script
- Frontend Auth Context & API Client
- Generated Chi Server (Users)
- RBAC/Users Migrate & Publish
- Frontend Apps Deploy Manifests
- Contracts Package Config
- Admin Apps UI Dependencies
- Admin Apps Dev/Test Deps
- Migration & Scaling Rationale
- CI/Release Pipeline & README
- web App Runtime Deps
- web App Dev/Test Deps
- Gateway Rate-Limit & CORS
- Definition of Done & Resilience Drill
- Backlog Categories & Query Keys
- Contracts TS Config
- RBAC/Users/Worker Service Configs
- API Versioning & Contracts Pipeline
- Security & Token Policy
- Mailer Implementations
- Service Bootstrap & Logger
- Graphify Skill Reference Docs
- Onboarding & Environments Guide
- E2E Mesh Test Script
- Template/Auth/Gateway K8s Stack
- web-admin-users Package Config
- Renovate Bot Config
- Production Deploy Script
- Remote Error Boundary UI
- Module Federation Remote Types
- Gateway Claims Client Cache
- Envelope Response & Rate Limit
- Platform Config Loader
- Realtime Service Bootstrap
- Auth Housekeeping & Bootstrap
- Worker Service Bootstrap
- Architecture Overview Docs
- Health & Readiness Router
- RBAC Deploy Manifests
- Users Deploy Manifests
- Root Package Scripts (Subset)
- Identity Context Middleware
- Pagination Helpers
- Generated OpenAPI TS Types
- Dependency Boundary Checker Script
- Template/Auth Compose DB Services
- Generated Param Error Types
- web-admin-roles Test Setup
- web-auth Test Setup
- web Package Config (Minimal)
- MSW Mock Handlers
- web Test Setup
- OTel Tracing Init
- JWT Access Claims Parsing
- Compose Specs Merge Script
- Golangci Service Isolation Rules
- Bundle Budget Checker Script
- Realtime Deploy Manifests
- Users Housekeeping Purge
- Worker Migration Helpers
- web Vite Dev Aliases
- Compose Spec CLI
- Perf Smoke Baseline
- Profile/Register Email Type
- Generated Param Error Type
- Generated Header Error Type
- Generated Unmarshal Error Type
- Generated Param Error Type
- Generated Unmarshal Error Type
- Generated Param Error Type
- Generated Header Error Type
- Generated Cookie Error Type
- Generated Unmarshal Error Type
- Tailwind Vite Plugin Dep
- React-DOM Types Dep
- TypeScript Dependency
- Vite React Plugin Dep
- Vitest Dependency
- Config Entrypoint Script
- Tailwind Vite Plugin Dep
- Terser Dependency
- Testing Library React Dep
- React Types Dependency
- React-DOM Types Dep
- Vitest Dependency
- OTel Collector Config
- Demo Deploy Script
- UAT Deploy Script
- Production Compose Stack
- Go Module Identity
- PNPM Workspace Config

## God Nodes (most connected - your core abstractions)
1. `WriteError()` - 32 edges
2. `OK()` - 31 edges
3. `Service` - 30 edges
4. `useToast()` - 20 edges
5. `Handlers` - 20 edges
6. `main()` - 20 edges
7. `BACKLOG (1.202 improvement items)` - 19 edges
8. `main()` - 18 edges
9. `Service` - 18 edges
10. `main()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Graphify Skill-Trigger Directive` --semantically_similar_to--> `Root CLAUDE.md graphify Project Instructions`  [INFERRED] [semantically similar]
  .claude/CLAUDE.md → CLAUDE.md
- `User Taste Profile` --semantically_similar_to--> `CI: web job (lint/test/build/budget)`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → .github/workflows/ci.yml
- `User Taste Profile` --semantically_similar_to--> `docs/BACKLOG.md Improvement Backlog`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `User Taste Profile` --semantically_similar_to--> `Host Bundle-Size Budget Gate`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `Security Headers Policy` --references--> `SecurityHeaders()`  [EXTRACTED]
  docs/SECURITY.md → internal/platform/security.go

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Skill Reference Document Set** — _claude_skills_graphify_skill_graphify_skill_command, _claude_skills_graphify_references_add_watch_reference, _claude_skills_graphify_references_exports_reference, _claude_skills_graphify_references_extraction_spec_reference, _claude_skills_graphify_references_github_and_merge_reference, _claude_skills_graphify_references_hooks_reference, _claude_skills_graphify_references_query_reference, _claude_skills_graphify_references_transcribe_reference, _claude_skills_graphify_references_update_reference [EXTRACTED 1.00]
- **CI Workflow Job Set** — _github_workflows_ci_workflow, _github_workflows_ci_commitlint_job, _github_workflows_ci_go_job, _github_workflows_ci_web_job, _github_workflows_ci_playwright_job, _github_workflows_ci_security_job [EXTRACTED 1.00]
- **Service Isolation Enforcement Mechanism** — readme_service_isolation_principle, _golangci_config, _golangci_shared_code_must_not_import_services_rule, _golangci_testutil_must_not_import_services_rule [INFERRED 0.85]
- **Module Federation Host (web) and Remote Micro-Frontends** — apps_web_docker_compose_web_service, apps_web_auth_docker_compose_web_auth_service, apps_web_admin_users_docker_compose_web_admin_users_service, apps_web_admin_roles_docker_compose_web_admin_roles_service [EXTRACTED 1.00]
- **Shared Kubernetes Deployment/HPA/Service Pattern Across Frontend Apps** — apps_web_admin_roles_deploy_k8s_deployment_deployment, apps_web_admin_users_deploy_k8s_deployment_deployment, apps_web_auth_deploy_k8s_deployment_deployment, apps_web_deploy_k8s_deployment_deployment [INFERRED 0.85]
- **BACKLOG.md's 18 improvement categories** — docs_backlog_security, docs_backlog_performance, docs_backlog_uiux_auth, docs_backlog_uiux_dashboard_shell, docs_backlog_uiux_manage_users, docs_backlog_uiux_roles_permissions, docs_backlog_reliability_resilience, docs_backlog_observability, docs_backlog_testing_qa, docs_backlog_developer_experience, docs_backlog_architecture_scalability, docs_backlog_data_migrations, docs_backlog_api_contracts, docs_backlog_docs_governance, docs_backlog_cicd_release, docs_backlog_infra_ops, docs_backlog_frontend_engineering, docs_backlog_product_roadmap [EXTRACTED 1.00]
- **Spec-first contract pipeline: spec, codegen/typed client, version freeze, and PR gate enforcing it together** — docs_contracts_openapi_spec_source_of_truth, docs_contracts_typed_client_pipeline, docs_api_versioning_v1_frozen_contract, docs_onboarding_pr_checklist [INFERRED 0.85]
- **Identity/token security flow across gateway, auth service, and frontend** — docs_contracts_identity_header_contract, docs_token_policy_access_refresh_split, docs_security_csrf_mitigation, docs_dod_hardening_extras [INFERRED 0.85]
- **Local dev stack assembled by layering compose files (base + lab overlay + optional observability profile)** — infra_compose_base, infra_compose_lab, infra_compose_observability [INFERRED 0.75]
- **Observability pipeline: OTel trace collection, Prometheus metrics scraping, Grafana visualization** — infra_compose_observability_otel_collector, infra_otel_collector, infra_compose_observability_prometheus, infra_prometheus_prometheus, infra_compose_observability_grafana, infra_grafana_provisioning_datasources_prometheus, infra_grafana_provisioning_dashboards_provider [INFERRED 0.75]
- **Production single public entry pattern: edge nginx fronts gateway and all microfrontend shells** — infra_compose_prod_edge, infra_compose_prod_gateway, infra_compose_prod_web, infra_compose_prod_web_auth, infra_compose_prod_web_admin_users, infra_compose_prod_web_admin_roles [EXTRACTED 1.00]
- **Template Service Kubernetes Deployment Stack** — services__template_deploy_k8s_deployment_template_service, services__template_deploy_k8s_hpa_template_service, services__template_deploy_k8s_service_template_service, services__template_deploy_k8s_migrate_job_template_service_migrate [INFERRED 0.85]
- **Auth Service Kubernetes Deployment Stack** — services_auth_deploy_k8s_deployment_auth, services_auth_deploy_k8s_hpa_auth, services_auth_deploy_k8s_service_auth, services_auth_deploy_k8s_migrate_job_auth_migrate [INFERRED 0.85]
- **Auth Session Lifecycle Flow (login/refresh/logout/session management)** — services_auth_openapi_login, services_auth_openapi_refresh, services_auth_openapi_logout, services_auth_openapi_listsessions, services_auth_openapi_revokesession, services_auth_openapi_revokeallsessions [INFERRED 0.85]
- **Migrate-before-rollout pattern (PLAN item 8)** — services_rbac_deploy_k8s_migrate_job_migratejob, services_users_deploy_k8s_migrate_job_migratejob, services_worker_deploy_k8s_migrate_job_migratejob [EXTRACTED 0.95]
- **Placeholder Deployment manifests copied from shared template** — services_rbac_deploy_k8s_deployment_deployment, services_realtime_deploy_k8s_deployment_deployment, services_users_deploy_k8s_deployment_deployment, services_worker_deploy_k8s_deployment_deployment [EXTRACTED 0.90]
- **Services enforcing permissions from the RBAC catalog** — services_rbac_openapi_permissioncatalog, services_users_openapi_profileapi, services_worker_openapi_auditviewer [INFERRED 0.80]

## Communities (149 total, 35 thin omitted)

### Community 0 - "Integration Test Harnesses"
Cohesion: 0.06
Nodes (71): envelope, proc, github.com/coder/websocket.Conn, gorm.io/gorm.DB, net/http/httptest.Server, net/http.Response, os/exec.Cmd, testing.T (+63 more)

### Community 1 - "Auth Domain & Session Service"
Cohesion: 0.06
Nodes (41): Profile, Session, time.Time, AuthResult, ErrConflict(), ErrForbidden(), ErrInternal(), ErrNotFound() (+33 more)

### Community 2 - "RBAC/Users Service Interfaces"
Cohesion: 0.08
Nodes (14): net/http.Request, net/http.ResponseWriter, Healthz(), ServerInterfaceWrapper, Unimplemented, MiddlewareFunc, ServerInterfaceWrapper, Unimplemented (+6 more)

### Community 3 - "Dashboard Shell UI Components"
Cohesion: 0.06
Nodes (36): Root(), applyTheme(), useGatewayHealth(), useTheme(), OfflineBanner(), SessionExpiringBanner(), CommandPalette(), CommandPaletteProps (+28 more)

### Community 4 - "web-admin-roles Package Config"
Cohesion: 0.04
Nodes (47): dependencies, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui, @tanstack/react-query, devDependencies (+39 more)

### Community 5 - "Shared UI Providers & Page Dev Entries"
Cohesion: 0.08
Nodes (35): el, qc, RolesPage(), getMock, el, qc, deleteMock, getMock (+27 more)

### Community 6 - "web-auth Package Config"
Cohesion: 0.04
Nodes (47): dependencies, react, react-dom, @starter/contracts, @starter/ui, devDependencies, jsdom, msw (+39 more)

### Community 7 - "Auth Frontend Pages"
Cohesion: 0.11
Nodes (28): api, forgot(), login(), LoginResult, readMessage(), register(), reset(), AuthFrame() (+20 more)

### Community 8 - "Compose Service Mesh Topology"
Cohesion: 0.10
Nodes (37): auth service (base mesh), gateway service (base mesh), postgres service (base mesh), rbac service (base mesh), realtime service (base mesh), redis service (base mesh), users service (base mesh), web (shell) service (base mesh) (+29 more)

### Community 9 - "UI Package Config"
Cohesion: 0.06
Nodes (35): description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react, @types/react-dom (+27 more)

### Community 10 - "App Routing & Top-Level Pages"
Cohesion: 0.08
Nodes (19): App(), AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), LoginPage, LoginResult, NotFoundPage() (+11 more)

### Community 11 - "Gateway Routing & Proxy"
Cohesion: 0.10
Nodes (20): net/http.Header, AccessClaims, Matcher, InjectTraceHeaders(), All(), IsValid(), MustValid(), ProxyDeps (+12 more)

### Community 12 - "RBAC & Users HTTP Handlers"
Cohesion: 0.15
Nodes (11): OK(), ErrBadRequest(), WriteError(), profileInput, Handlers, Service, NewHandlers(), Handlers (+3 more)

### Community 13 - "Users Page Table UI"
Cohesion: 0.10
Nodes (23): ActivityFeed(), ActivityItem, ColumnKey, columnLabel(), csvCell(), DEFAULT_COLUMNS, DEFAULT_WIDTHS, deviceLabel() (+15 more)

### Community 14 - "Biome Lint/Format Config"
Cohesion: 0.07
Nodes (29): files, ignore, enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript (+21 more)

### Community 15 - "Request Middleware & Error Reporting"
Cohesion: 0.09
Nodes (24): chi.Context, InitErrorReporter(), ReportError(), toError(), chiRouteContext(), CorrelationID(), LoggerFromContext(), newRequestID() (+16 more)

### Community 16 - "GORM Logger & Scheduler"
Cohesion: 0.10
Nodes (18): gorm.io/gorm/logger.Interface, gorm.io/gorm/logger.LogLevel, log/slog.Logger, time.Duration, NewGormLogger(), discardLogger(), TestGormLoggerTrace(), redis.Client (+10 more)

### Community 17 - "OpenAPI Schemas (Template/Auth/Gateway)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "RBAC Domain Model & Service"
Cohesion: 0.11
Nodes (12): Loggerish, permissionRow, Role, rolePermission, userRole, Publisher, Claims, Publisher (+4 more)

### Community 19 - "Realtime WebSocket Hub"
Cohesion: 0.15
Nodes (11): sync.Mutex, Hub, Client, prometheusGauge, contains(), Handlers, NewHandlers(), jsonMarshal() (+3 more)

### Community 20 - "Generated Chi Server (Template)"
Cohesion: 0.11
Nodes (16): chi.Router, ChiServerOptions, EnvelopeOK, InvalidParamFormatError, MiddlewareFunc, RequiredHeaderError, RequiredParamError, ServerInterface (+8 more)

### Community 21 - "Roles Page UI Components"
Cohesion: 0.11
Nodes (17): api, Role, RoleModal(), Avatar(), Badge(), ExpandableText(), Modal(), ModalActions() (+9 more)

### Community 22 - "Generated Chi Server (Auth)"
Cohesion: 0.13
Nodes (20): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, ForgotInput, LoginInput, ResetInput, net/http.Handler, chi.Router, ChiServerOptions (+12 more)

### Community 23 - "Root Package Scripts & Lint"
Cohesion: 0.08
Nodes (23): @biomejs/biome, devDependencies, @biomejs/biome, js-yaml, @playwright/test, engines, node, js-yaml (+15 more)

### Community 24 - "Generated Chi Server (RBAC)"
Cohesion: 0.12
Nodes (21): CreatePermissionJSONBody, CreatePermissionJSONRequestBody, Role, RoleInput, SetUserRolesJSONBody, SetUserRolesJSONRequestBody, UpdateRoleJSONBody, UpdateRoleJSONRequestBody (+13 more)

### Community 25 - "Auth Handlers & Session Cookies"
Cohesion: 0.14
Nodes (14): ctxKeyHash, forgotInput, loginInput, registerInput, resetInput, currentRefreshHash(), Config, ctxKeySub (+6 more)

### Community 26 - "web-admin-roles TS Config"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 27 - "web-admin-users TS Config"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 28 - "web-auth TS Config"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 29 - "web TS Config"
Cohesion: 0.09
Nodes (22): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+14 more)

### Community 30 - "Worker Stream Consumer"
Cohesion: 0.17
Nodes (9): context.Context, Consumer, Hub, redis.Client, redis.Client, hostnameConsumer(), NewConsumer(), osHostname() (+1 more)

### Community 31 - "Users Audit & Service"
Cohesion: 0.17
Nodes (12): Audit(), Loggerish, StreamPublisher, AuditEvent, Loggerish, Profile, Service, redis.Client (+4 more)

### Community 32 - "Local Dev Launcher Script"
Cohesion: 0.16
Nodes (21): ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra(), DATABASE_URL, die(), docker_publishes() (+13 more)

### Community 33 - "Frontend Auth Context & API Client"
Cohesion: 0.15
Nodes (16): api, handleLoggedIn(), AuthContext, AuthProvider(), AuthState, ApiClient, createApiClient(), CreateClientOptions (+8 more)

### Community 34 - "Generated Chi Server (Users)"
Cohesion: 0.16
Nodes (16): ListUsersParamsOrder, ListUsersParamsSort, chi.Router, ChiServerOptions, EnvelopeFail, EnvelopeMeta, EnvelopeOK, ListUsersParams (+8 more)

### Community 35 - "RBAC/Users Migrate & Publish"
Cohesion: 0.11
Nodes (14): redis.Client, Publish(), migrateUp(), migrationURL(), trimScheme(), RedisPublisher, redis.Client, MigrateUp() (+6 more)

### Community 36 - "Frontend Apps Deploy Manifests"
Cohesion: 0.10
Nodes (20): web-admin-roles Kubernetes Deployment, web-admin-roles HorizontalPodAutoscaler, web-admin-roles Kubernetes Service, web-admin-roles Docker Compose Service, web-admin-roles Dev HTML Entry, web-admin-users Kubernetes Deployment, web-admin-users HorizontalPodAutoscaler, web-admin-users Kubernetes Service (+12 more)

### Community 37 - "Contracts Package Config"
Cohesion: 0.11
Nodes (18): openapi-fetch, openapi-typescript, dependencies, openapi-fetch, description, devDependencies, js-yaml, openapi-typescript (+10 more)

### Community 38 - "Admin Apps UI Dependencies"
Cohesion: 0.12
Nodes (17): dependencies, gsap, @gsap/react, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui (+9 more)

### Community 39 - "Admin Apps Dev/Test Deps"
Cohesion: 0.12
Nodes (17): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, @testing-library/react, @testing-library/user-event, @types/react (+9 more)

### Community 40 - "Migration & Scaling Rationale"
Cohesion: 0.15
Nodes (17): ADR-0001: Fresh-build Pivot, GORM Replaces sqlc/pgx-direct, Schema-per-Service Decision, Redis Streams Event Backbone, Schema-per-Service Data Ownership, Backlog: Architecture & Scalability, Backlog: Data & Migrations, Backlog: Docs & Governance (+9 more)

### Community 41 - "CI/Release Pipeline & README"
Cohesion: 0.19
Nodes (16): User Taste Profile, CI: commitlint job, CI: go job (lint/build/test/contracts), CI: playwright smoke job, CI: security (Trivy + Semgrep) job, CI: web job (lint/test/build/budget), CI Workflow, release-please job (+8 more)

### Community 42 - "web App Runtime Deps"
Cohesion: 0.13
Nodes (15): dependencies, @phosphor-icons/react, react, react-dom, react-router-dom, @starter/contracts, @starter/ui, @tanstack/react-query (+7 more)

### Community 43 - "web App Dev/Test Deps"
Cohesion: 0.13
Nodes (15): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 44 - "Gateway Rate-Limit & CORS"
Cohesion: 0.22
Nodes (13): ctxKeyAuth, net/http.HandlerFunc, redis_rate.Limiter, AggregateDocs(), ScalarHandlers(), bodyLimit(), clientIP(), corsHandler() (+5 more)

### Community 45 - "Definition of Done & Resilience Drill"
Cohesion: 0.16
Nodes (11): Ops Files Per Component, v6 Definition of Done, DoD Evidence Checklist, Hardening Extras Found During Execution, DoD Wave Gates (0-7), .github/workflows/ci.yml, DRILL_DSN, DRILL_REDIS (+3 more)

### Community 46 - "Backlog Categories & Query Keys"
Cohesion: 0.14
Nodes (14): BACKLOG (1.202 improvement items), Backlog: CI/CD & Release, Backlog: Frontend Engineering, Backlog: Infra & Ops, Backlog: Performance, Backlog: Product / Roadmap, Backlog: Testing & QA, Backlog: UI/UX Login, Register & Auth (+6 more)

### Community 47 - "Contracts TS Config"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+5 more)

### Community 48 - "RBAC/Users/Worker Service Configs"
Cohesion: 0.14
Nodes (14): rbac codegen config, RBAC permission/role catalog API, resolveClaims internal endpoint, realtimeInfo endpoint (ws url/protocol), users codegen config, users Profile CRUD API, worker Deployment, worker HorizontalPodAutoscaler (+6 more)

### Community 49 - "API Versioning & Contracts Pipeline"
Cohesion: 0.19
Nodes (13): Spec-First Without a Behavioral Contract, API Versioning Policy, Deliberately Avoided Versioning Practices, Deprecation Mechanics (RFC-9745), /api/v1 Frozen Contract, Adding v2 API Strategy, Backlog: API & Contracts, Contracts Pipeline (spec-first) (+5 more)

### Community 50 - "Security & Token Policy"
Cohesion: 0.19
Nodes (12): Web Micro-frontend Federation, Backlog: Security, Identity-Header Contract, Security Posture, CSRF Mitigation by Construction, Security Headers Policy, Security Scanning (gosec/Trivy/semgrep), Secrets Management (+4 more)

### Community 51 - "Mailer Implementations"
Cohesion: 0.23
Nodes (9): net/smtp.Auth, BuildMIME(), Mail, Mailer, NewMailer(), TestBuildMIME(), ConsoleMailer, SMTPConfig (+1 more)

### Community 52 - "Service Bootstrap & Logger"
Cohesion: 0.21
Nodes (8): NewLogger(), GracefulRun(), config, closeDB(), main(), pingDB(), main(), config

### Community 53 - "Graphify Skill Reference Docs"
Cohesion: 0.20
Nodes (11): Graphify Skill-Trigger Directive, Add & Watch Reference Doc, Exports & Benchmark Reference Doc, Extraction Subagent Prompt Spec, GitHub Clone & Cross-Repo Merge Reference Doc, Commit Hook & CLAUDE.md Integration Reference Doc, Query/Path/Explain Reference Doc, Transcribe Video/Audio Reference Doc (+3 more)

### Community 54 - "Onboarding & Environments Guide"
Cohesion: 0.18
Nodes (10): Backlog: Developer Experience, Onboarding Guide, Dev/Lab/UAT/Demo/Prod Environments, Local Gate Pipeline (mirrors CI), PR Checklist, infra/compose.base.yml, compose.lab.yml (Lab Overlay), infra/compose.observability.yml (+2 more)

### Community 55 - "E2E Mesh Test Script"
Cohesion: 0.20
Nodes (10): ACCESS_TOKEN_SECRET, APP_PUBLIC_URL, down(), E2E_ADMIN_PASSWORD, INTERNAL_SECRET, RBAC_INTERNAL_URL, REDIS_ADDR, e2e-mesh.sh script (+2 more)

### Community 56 - "Template/Auth/Gateway K8s Stack"
Cohesion: 0.27
Nodes (11): template-service Deployment, template-service HorizontalPodAutoscaler, template-service-migrate Job, template-service k8s Service, auth Deployment, auth HorizontalPodAutoscaler, auth-migrate Job, auth k8s Service (+3 more)

### Community 57 - "web-admin-users Package Config"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, preview, test, type (+1 more)

### Community 58 - "Renovate Bot Config"
Cohesion: 0.20
Nodes (9): config:recommended, dependencies, :semanticCommits, :semanticCommitScope(deps), extends, labels, packageRules, rangeStrategy (+1 more)

### Community 59 - "Production Deploy Script"
Cohesion: 0.40
Nodes (8): compose(), die(), docker_publishes(), ensure_docker(), log(), pick(), resolve_lab_ports(), deploy.sh script

### Community 60 - "Remote Error Boundary UI"
Cohesion: 0.25
Nodes (5): CopyErrorButton(), Props, RemoteErrorBoundary, State, useCopy()

### Community 61 - "Module Federation Remote Types"
Cohesion: 0.22
Nodes (7): Document, web_admin_roles/RolesPage, web_admin_users/UsersPage, web_auth/ForgotPage, web_auth/LoginPage, web_auth/RegisterPage, web_auth/ResetPage

### Community 62 - "Gateway Claims Client Cache"
Cohesion: 0.31
Nodes (5): net/http.Client, sync.RWMutex, cachedClaims, ClaimsClient, NewClaimsClient()

### Community 63 - "Envelope Response & Rate Limit"
Cohesion: 0.25
Nodes (7): Fail(), WriteJSON(), failEnvelope, okEnvelope, clientIP(), redis.Client, RateLimit()

### Community 64 - "Platform Config Loader"
Cohesion: 0.36
Nodes (6): LoadDotEnv(), MustParseEnv(), closeDB(), main(), pingDB(), T

### Community 65 - "Realtime Service Bootstrap"
Cohesion: 0.39
Nodes (7): config, bearerGuard(), envFile(), redis.Client, main(), newRedis(), splitCSV()

### Community 66 - "Auth Housekeeping & Bootstrap"
Cohesion: 0.39
Nodes (6): SweepSessions(), lowerEnv(), main(), pingDB(), seedAdmin(), sqlClose()

### Community 67 - "Worker Service Bootstrap"
Cohesion: 0.39
Nodes (7): closeDB(), envFile(), redis.Client, main(), newRedis(), pingDB(), config

### Community 68 - "Architecture Overview Docs"
Cohesion: 0.29
Nodes (7): ARCHITECTURE overview, Fail-Closed Route Registry, Gateway Topology, JWT Verified Once At Edge, Observability Flow, Backlog: Observability, Realtime Connections Autoscaling Math

### Community 69 - "Health & Readiness Router"
Cohesion: 0.38
Nodes (5): Readyz(), TestReadyz(), chi.Router, NewRouter(), Checker

### Community 70 - "RBAC Deploy Manifests"
Cohesion: 0.29
Nodes (7): rbac Deployment, rbac HorizontalPodAutoscaler, rbac migrate Job, rbac Service, rbac compose postgres, rbac compose redis, rbac compose service

### Community 71 - "Users Deploy Manifests"
Cohesion: 0.29
Nodes (7): users Deployment, users HorizontalPodAutoscaler, users migrate Job, users Service, users compose postgres, users compose redis, users compose service

### Community 72 - "Root Package Scripts (Subset)"
Cohesion: 0.33
Nodes (6): scripts, build, check:budget, dev, preview, test

### Community 73 - "Identity Context Middleware"
Cohesion: 0.33
Nodes (5): ctxKeyEmail, EmailFromContext(), ctxKeySub, IdentityMiddleware(), SubFromContext()

### Community 74 - "Pagination Helpers"
Cohesion: 0.47
Nodes (3): ListOK(), listData, Meta

### Community 75 - "Generated OpenAPI TS Types"
Cohesion: 0.33
Nodes (5): components, $defs, operations, paths, webhooks

### Community 76 - "Dependency Boundary Checker Script"
Cohesion: 0.33
Nodes (4): exts, nodeBuiltins, root, violations

### Community 77 - "Template/Auth Compose DB Services"
Cohesion: 0.33
Nodes (6): template docker-compose postgres service, template docker-compose redis service, template docker-compose app service, auth docker-compose app service, auth docker-compose postgres service, auth docker-compose redis service

### Community 81 - "web Package Config (Minimal)"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 84 - "OTel Tracing Init"
Cohesion: 0.60
Nodes (4): go.opentelemetry.io/otel/sdk/resource.Resource, InitTracer(), newResource(), trimSchemeHTTP()

### Community 85 - "JWT Access Claims Parsing"
Cohesion: 0.50
Nodes (3): jwt.RegisteredClaims, ParseAccessToken(), AccessClaims

### Community 86 - "Compose Specs Merge Script"
Cohesion: 0.40
Nodes (4): merged, outDir, root, servicesDir

### Community 87 - "Golangci Service Isolation Rules"
Cohesion: 0.67
Nodes (4): golangci-lint Configuration, depguard rule: shared code must not import services, depguard rule: testutil must not import services, Single go.mod / Compiler-Enforced Service Isolation

### Community 88 - "Bundle Budget Checker Script"
Cohesion: 0.50
Nodes (3): budget, dist, kb

### Community 89 - "Realtime Deploy Manifests"
Cohesion: 0.50
Nodes (4): realtime Deployment, realtime HorizontalPodAutoscaler, realtime PodDisruptionBudget, realtime Service

### Community 90 - "Users Housekeeping Purge"
Cohesion: 0.67
Nodes (3): redis.Client, PurgeDeletedProfiles(), QueueProfilePurge()

### Community 91 - "Worker Migration Helpers"
Cohesion: 0.83
Nodes (3): MigrateUp(), migrationURL(), trimScheme()

### Community 95 - "Profile/Register Email Type"
Cohesion: 0.67
Nodes (3): ProfileInput, RegisterInput, github.com/oapi-codegen/runtime/types.Email

## Knowledge Gaps
- **492 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+487 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `API Versioning & Contracts Pipeline` to `Security & Token Policy`, `RBAC/Users Service Interfaces`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Contracts Pipeline (spec-first)` connect `API Versioning & Contracts Pipeline` to `Security & Token Policy`, `Backlog Categories & Query Keys`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _492 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Integration Test Harnesses` be split into smaller, more focused modules?**
  _Cohesion score 0.05526675786593707 - nodes in this community are weakly interconnected._
- **Should `Auth Domain & Session Service` be split into smaller, more focused modules?**
  _Cohesion score 0.05594679186228482 - nodes in this community are weakly interconnected._
- **Should `RBAC/Users Service Interfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.07932692307692307 - nodes in this community are weakly interconnected._
- **Should `Dashboard Shell UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05706214689265537 - nodes in this community are weakly interconnected._