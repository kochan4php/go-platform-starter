# Graph Report - go-platform-starter  (2026-08-29)

## Corpus Check
- 352 files · ~189,058 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2670 nodes · 5016 edges · 209 communities (153 shown, 56 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 250 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d434989`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- newFixture
- Service
- net/http.Request
- GormLogger
- devDependencies
- ui-system.tsx
- devDependencies
- auth-ui.tsx
- auth service (base mesh)
- ui/package.json
- App.tsx
- Config
- resilientTransport
- UsersPage.tsx
- ignore
- middleware.go
- DashboardShell.tsx
- auth service API (OpenAPI doc)
- context.Context
- Client
- _template/gen/gen.go
- What You Must Do When Invoked
- auth/gen/gen.go
- scripts
- rbac/gen/gen.go
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
- RedisPublisher
- web (host shell) Docker Compose Service
- contracts/package.json
- dependencies
- devDependencies
- ARCHITECTURE overview
- go-platform-starter README Overview
- dependencies
- devDependencies
- Audit
- resilience-drill.sh
- BACKLOG (1.202 improvement items)
- compilerOptions
- RBAC permission/role catalog API
- Contracts Pipeline (spec-first)
- Security Posture
- InitTracer
- index.tsx
- /graphify Skill Command
- fail
- e2e-mesh.sh
- template-service Deployment
- web-admin-users/package.json
- renovate.json
- deploy.sh
- .Kick
- remotes.d.ts
- index.ts
- .RegisterWithSub
- RequiredHeaderError
- main.tsx
- ADR-0001: Fresh-build Pivot
- NewRouter
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
- ui.tsx
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
- Fail
- gorm.io/gorm.DB
- web/vite.config.ts
- composespec/main.go
- graphify reference: extra exports and benchmark
- Profile
- log/slog.Logger
- TestRoomsBroadcastDenyAndForceLogoutKick
- main
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- RoleInput
- graphify reference: GitHub clone and cross-repo merge
- @tailwindcss/vite
- @types/react-dom
- typescript
- Config
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
- Config
- extraction-spec.md
- main
- Loggerish
- StartRedis
- Publish
- StartPostgres
- Service
- @tailwindcss/vite
- MigrateUp
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
- net/http.Handler
- Profile
- performance.js
- redis-bigkeys.sh
- main
- Profile
- K6.md
- check-contracts.mjs
- RequireSessionIdentity
- openapi-fuzz.mjs
- TestDatabaseTimeoutsPreserveDSN
- NewLogger
- RoleSummary
- backup.sh
- check-migration-safety.sh
- Profile
- restore-test.sh
- WebVitals
- time.Time
- Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md
- chaos-qa.sh
- newRBACFixture
- @vitejs/plugin-react
- Architecture & scalability engineering
- ResizeAvatar
- check-template-drift.mjs
- Q: Implement all Engineering items in Architecture & Scalability from docs/BACKLOG.md
- check-architecture.mjs

## God Nodes (most connected - your core abstractions)
1. `OK()` - 48 edges
2. `WriteError()` - 48 edges
3. `Service` - 45 edges
4. `Handlers` - 30 edges
5. `main()` - 30 edges
6. `ErrBadRequest()` - 29 edges
7. `Consumer` - 27 edges
8. `useToast()` - 27 edges
9. `main()` - 26 edges
10. `ServerInterfaceWrapper` - 24 edges

## Surprising Connections (you probably didn't know these)
- `User Taste Profile` --semantically_similar_to--> `CI: web job (lint/test/build/budget)`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → .github/workflows/ci.yml
- `User Taste Profile` --semantically_similar_to--> `docs/BACKLOG.md Improvement Backlog`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `User Taste Profile` --semantically_similar_to--> `Host Bundle-Size Budget Gate`  [INFERRED] [semantically similar]
  .commandcode/taste/taste.md → README.md
- `Graphify Skill-Trigger Directive` --semantically_similar_to--> `Root CLAUDE.md graphify Project Instructions`  [INFERRED] [semantically similar]
  .claude/CLAUDE.md → CLAUDE.md
- `TestReadyz()` --calls--> `fail()`  [INFERRED]
  internal/platform/platform_test.go → cmd/yamlcheck/main.go

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

## Communities (209 total, 56 thin omitted)

### Community 0 - "newFixture"
Cohesion: 0.18
Nodes (22): capturedEvent, capturedPublisher, fixture, redis.Client, indexOf(), mustRegister(), newFixture(), resetTokenFromMail() (+14 more)

### Community 1 - "Service"
Cohesion: 0.12
Nodes (14): ClaimsClient, github.com/lib/pq.StringArray, AuthResult, passwordRecord, ActiveSecret(), RedisPublisher, TokenIntrospection, ErrBadCredentials() (+6 more)

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
Cohesion: 0.08
Nodes (26): el, qc, deleteMock, getMock, patchMock, permissions, postMock, putMock (+18 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, react, react-dom, @starter/contracts, @starter/ui, devDependencies, jsdom, msw (+39 more)

### Community 7 - "auth-ui.tsx"
Cohesion: 0.08
Nodes (47): api, apiError(), AuthApiError, forgot(), login(), LoginResult, readMessage(), register() (+39 more)

### Community 8 - "auth service (base mesh)"
Cohesion: 0.10
Nodes (37): auth service (base mesh), gateway service (base mesh), postgres service (base mesh), rbac service (base mesh), realtime service (base mesh), redis service (base mesh), users service (base mesh), web (shell) service (base mesh) (+29 more)

### Community 9 - "ui/package.json"
Cohesion: 0.06
Nodes (36): description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react, @types/react-dom (+28 more)

### Community 10 - "App.tsx"
Cohesion: 0.09
Nodes (29): AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), handleLoggedIn(), handleReauthenticated(), LoginPage, LoginResult (+21 more)

### Community 11 - "Config"
Cohesion: 0.06
Nodes (43): consumerQuotaPolicy, ctxKeyAuth, net/netip.Prefix, Config, jwt.RegisteredClaims, ParseAccessToken(), ParseAccessTokenRing(), ParseSigningKeys() (+35 more)

### Community 12 - "resilientTransport"
Cohesion: 0.06
Nodes (35): context.CancelFunc, io.ReadCloser, net/http.Header, net/http.Response, net/http.Transport, net/url.URL, sync/atomic.Uint64, bufferedWriter (+27 more)

### Community 13 - "UsersPage.tsx"
Cohesion: 0.08
Nodes (35): ActivityFeed(), ActivityItem, ColumnKey, columnLabel(), copyText(), csvCell(), dateBoundary(), DEFAULT_COLUMNS (+27 more)

### Community 14 - "ignore"
Cohesion: 0.06
Nodes (34): files, ignore, enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript (+26 more)

### Community 15 - "middleware.go"
Cohesion: 0.09
Nodes (26): chi.Context, InitErrorReporter(), ReportError(), toError(), chiRouteContext(), CorrelationID(), DebugRequest(), debugRequest() (+18 more)

### Community 16 - "DashboardShell.tsx"
Cohesion: 0.05
Nodes (39): Root(), applyTheme(), useGatewayHealth(), useTheme(), OfflineBanner(), SessionExpiringBanner(), CommandPalette(), CommandPaletteProps (+31 more)

### Community 17 - "auth service API (OpenAPI doc)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "context.Context"
Cohesion: 0.09
Nodes (29): context.Context, Claims, Loggerish, ErrBadRequest(), ErrConflict(), ErrInternal(), ErrNotFound(), ErrUnauthorized() (+21 more)

### Community 19 - "Client"
Cohesion: 0.12
Nodes (12): sync.RWMutex, Hub, Client, prometheusGauge, contains(), Handlers, NewHandlers(), NewHandlersWithKeyRing() (+4 more)

### Community 20 - "_template/gen/gen.go"
Cohesion: 0.11
Nodes (16): chi.Router, ChiServerOptions, EnvelopeOK, InvalidParamFormatError, MiddlewareFunc, RequiredHeaderError, RequiredParamError, ServerInterface (+8 more)

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "auth/gen/gen.go"
Cohesion: 0.05
Nodes (28): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, AdminSetUserStateJSONBody, AdminSetUserStateJSONBodyStatus, AdminSetUserStateJSONRequestBody, ChangePasswordJSONBody, ChangePasswordJSONRequestBody, ConfirmPasswordJSONBody (+20 more)

### Community 23 - "scripts"
Cohesion: 0.07
Nodes (29): @axe-core/playwright, @biomejs/biome, js-yaml, devDependencies, @axe-core/playwright, @biomejs/biome, js-yaml, @playwright/test (+21 more)

### Community 24 - "rbac/gen/gen.go"
Cohesion: 0.08
Nodes (24): CreatePermissionJSONBody, CreatePermissionJSONRequestBody, RoleInput, SetUserRolesJSONBody, SetUserRolesJSONRequestBody, UpdateRoleJSONBody, UpdateRoleJSONRequestBody, chi.Router (+16 more)

### Community 25 - "OK"
Cohesion: 0.13
Nodes (17): ctxKeyHash, ctxKeySub, forgotInput, loginInput, OK(), WriteError(), registerInput, resetInput (+9 more)

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
Cohesion: 0.05
Nodes (36): net/http.Client, net/smtp.Auth, Consumer, HTTPWebhookProvider, BuildMIME(), Mail, Mailer, NewMailer() (+28 more)

### Community 31 - "main"
Cohesion: 0.17
Nodes (12): LoadDotEnv(), loadSecretFiles(), MustParseEnv(), TestSecretFileEnvAdapterIgnoresOptionalAppEnvFile(), GracefulRun(), shutdownTimeout(), main(), closeDB() (+4 more)

### Community 32 - "dev-all.sh"
Cohesion: 0.12
Nodes (25): Dev/Lab/UAT/Demo/Prod Environments, infra/compose.observability.yml, deploy-lab.sh script, ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra() (+17 more)

### Community 33 - "check-coverage.mjs"
Cohesion: 0.11
Nodes (16): badgeDir, byPackage, changed, changedLines, changedRows, changedScore, listed, merged (+8 more)

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
Cohesion: 0.09
Nodes (22): openapi-fetch, openapi-typescript, dependencies, openapi-fetch, description, devDependencies, js-yaml, openapi-typescript (+14 more)

### Community 38 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, gsap, @gsap/react, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui (+9 more)

### Community 39 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, @testing-library/react, @testing-library/user-event, @types/react (+9 more)

### Community 40 - "ARCHITECTURE overview"
Cohesion: 0.13
Nodes (16): Schema-per-Service Decision, ARCHITECTURE overview, Gateway Topology, JWT Verified Once At Edge, Observability Flow, Redis Streams Event Backbone, Schema-per-Service Data Ownership, Backlog: Observability (+8 more)

### Community 41 - "go-platform-starter README Overview"
Cohesion: 0.19
Nodes (16): User Taste Profile, CI: commitlint job, CI: go job (lint/build/test/contracts), CI: playwright smoke job, CI: security (Trivy + Semgrep) job, CI: web job (lint/test/build/budget), CI Workflow, release-please job (+8 more)

### Community 42 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @phosphor-icons/react, react, react-dom, react-router-dom, @starter/contracts, @starter/ui, @tanstack/react-query (+7 more)

### Community 43 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 44 - "Audit"
Cohesion: 0.12
Nodes (13): sync.Mutex, Audit(), Loggerish, AuditEvent, StreamPublisher, newRequestID(), redis.Client, PublishWithAuditOutbox() (+5 more)

### Community 45 - "resilience-drill.sh"
Cohesion: 0.15
Nodes (12): v6 Definition of Done, DoD Evidence Checklist, Hardening Extras Found During Execution, DoD Wave Gates (0-7), .github/workflows/ci.yml, infra/compose.base.yml, compose.lab.yml (Lab Overlay), DRILL_DSN (+4 more)

### Community 46 - "BACKLOG (1.202 improvement items)"
Cohesion: 0.13
Nodes (18): BACKLOG (1.202 improvement items), Backlog: CI/CD & Release, Backlog: Data & Migrations, Backlog: Docs & Governance, Backlog: Frontend Engineering, Backlog: Infra & Ops, Backlog: Performance, Backlog: Product / Roadmap (+10 more)

### Community 47 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+5 more)

### Community 48 - "RBAC permission/role catalog API"
Cohesion: 0.14
Nodes (14): rbac codegen config, RBAC permission/role catalog API, resolveClaims internal endpoint, realtimeInfo endpoint (ws url/protocol), users codegen config, users Profile CRUD API, worker Deployment, worker HorizontalPodAutoscaler (+6 more)

### Community 49 - "Contracts Pipeline (spec-first)"
Cohesion: 0.15
Nodes (17): Spec-First Without a Behavioral Contract, API Versioning Policy, Deliberately Avoided Versioning Practices, Deprecation Mechanics (RFC-9745), /api/v1 Frozen Contract, Adding v2 API Strategy, Fail-Closed Route Registry, Backlog: API & Contracts (+9 more)

### Community 50 - "Security Posture"
Cohesion: 0.21
Nodes (12): Web Micro-frontend Federation, Backlog: Security, Identity-Header Contract, Security Posture, CSRF Mitigation by Construction, Security Headers Policy, Security Scanning (gosec/Trivy/semgrep), Secrets Management (+4 more)

### Community 51 - "InitTracer"
Cohesion: 0.21
Nodes (9): go.opentelemetry.io/otel/sdk/resource.Resource, buildValue(), recordAPIError(), recordBuildInfo(), TestRuntimeProcessAndBuildCollectorsAreRegistered(), InitTracer(), newResource(), traceSampleRatio() (+1 more)

### Community 52 - "index.tsx"
Cohesion: 0.06
Nodes (38): api, PermissionInfo, Role, AuditEntry, download(), exportMatrixPng(), iconGlyphs, iconNames (+30 more)

### Community 53 - "/graphify Skill Command"
Cohesion: 0.20
Nodes (11): Graphify Skill-Trigger Directive, Add & Watch Reference Doc, Exports & Benchmark Reference Doc, Extraction Subagent Prompt Spec, GitHub Clone & Cross-Repo Merge Reference Doc, Commit Hook & CLAUDE.md Integration Reference Doc, Query/Path/Explain Reference Doc, Transcribe Video/Audio Reference Doc (+3 more)

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

### Community 61 - "remotes.d.ts"
Cohesion: 0.20
Nodes (7): Document, web_admin_roles/RolesPage, web_admin_users/UsersPage, web_auth/ForgotPage, web_auth/LoginPage, web_auth/RegisterPage, web_auth/ResetPage

### Community 62 - "index.ts"
Cohesion: 0.11
Nodes (25): api, AuthContext, AuthProvider(), SessionUser, RequirePermission(), addBreadcrumb(), ApiClient, Breadcrumb (+17 more)

### Community 63 - ".RegisterWithSub"
Cohesion: 0.18
Nodes (13): totpCode(), verifyTOTP(), CalibrateBcryptCost(), checkHIBP(), hashPassword(), passwordHistoryContains(), passwordNeedsRehash(), sha1Hex() (+5 more)

### Community 65 - "main.tsx"
Cohesion: 0.21
Nodes (8): App(), observeWebVitals(), rating(), report(), VitalName, el, worker, handlers

### Community 66 - "ADR-0001: Fresh-build Pivot"
Cohesion: 0.25
Nodes (8): ADR-0001: Fresh-build Pivot, GORM Replaces sqlc/pgx-direct, Ops Files Per Component, Backlog: Architecture & Scalability, Scaling Guide, Perf Smoke Baseline Through Gateway, Sharding/Splitting Triggers, main()

### Community 67 - "NewRouter"
Cohesion: 0.22
Nodes (10): Readyz(), withBaseLogger(), chi.Router, NewRouter(), Checker, config, bearerGuard(), envFile() (+2 more)

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

### Community 78 - "ui.tsx"
Cohesion: 0.14
Nodes (17): DeleteRoleModal(), HealthState, Probe(), Theme, CopyErrorButton(), Props, RemoteErrorBoundary, State (+9 more)

### Community 81 - "web/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 82 - "main"
Cohesion: 0.13
Nodes (15): redis.Client, NewRedisClient(), WaitForRedis(), SweepSessions(), randomToken(), RegisterSessionMetrics(), MigrateUp(), migrationURL() (+7 more)

### Community 84 - "main"
Cohesion: 0.24
Nodes (11): encoding/json.RawMessage, config, jobConfig, closeDB(), envFile(), redis.Client, main(), parseJobs() (+3 more)

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

### Community 90 - "Fail"
Cohesion: 0.11
Nodes (19): testing.B, Fail(), WriteJSON(), ListOK(), ParsePagination(), BenchmarkWriteJSON(), profileInput, failEnvelope (+11 more)

### Community 91 - "gorm.io/gorm.DB"
Cohesion: 0.17
Nodes (23): gorm.io/gorm.DB, recordingMailer, PurgeDeletedProfiles(), RefreshReadModels(), FlushAuditOutbox(), closeDB(), fixture, redis.Client (+15 more)

### Community 94 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 95 - "Profile"
Cohesion: 0.33
Nodes (4): Profile, RoleSummary, Config, RoleSummary

### Community 96 - "log/slog.Logger"
Cohesion: 0.17
Nodes (11): container/list.Element, container/list.List, log/slog.Logger, cachedClaims, claimEntry, ClaimsClient, NewClaimsClient(), redis.Client (+3 more)

### Community 97 - "TestRoomsBroadcastDenyAndForceLogoutKick"
Cohesion: 0.26
Nodes (11): github.com/coder/websocket.Conn, net/http/httptest.Server, dialWS(), mint(), readMsg(), send(), TestRoomsBroadcastDenyAndForceLogoutKick(), redis.Client (+3 more)

### Community 98 - "main"
Cohesion: 0.25
Nodes (11): databaseTimeouts(), envBool(), envDuration(), envInt(), OpenDatabase(), TestDatabaseEnvironmentDefaultsAndOverrides(), StartPprof(), config (+3 more)

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

### Community 111 - "Reliability & Resilience"
Cohesion: 0.25
Nodes (7): Backup and disaster recovery, Deliberate non-mechanisms, Deployment safety, Multi-region readiness checklist, Reliability & Resilience, Runtime controls, Worker and DLQ operations

### Community 142 - "testing.T"
Cohesion: 0.11
Nodes (23): testing.T, discardLogger(), TestEnvelopeGoldenFile(), TestFailEnvelopeShape(), TestGormLoggerTrace(), TestListOKShape(), TestLoadDotEnv(), TestOKEnvelopeShape() (+15 more)

### Community 152 - "main"
Cohesion: 0.17
Nodes (11): net/http.HandlerFunc, frontendError, SetSlowRequestThreshold(), serviceStatus, AggregateDocs(), ScalarHandlers(), TestScalarPageHasExecutableCSPAndSRI(), StatusPage() (+3 more)

### Community 154 - "StartRedis"
Cohesion: 0.31
Nodes (7): TestDistributedLockOwnershipAndRenewal(), TestLeaderElectionAllowsOneActiveLeader(), TestSchedulerSingleRunnerAndPanicSafety(), TestUserLifecycleTransitions(), ValidateUserTransition(), StartRedis(), UserStatus

### Community 155 - "Publish"
Cohesion: 0.17
Nodes (15): MFAEnrollment, DecryptForSubject(), DeriveKey(), EncryptForSubject(), KeyedDigest(), VerifyDigest(), TestSecurityPrimitives(), TestStreamMessageSigningAndEncryption() (+7 more)

### Community 156 - "StartPostgres"
Cohesion: 0.18
Nodes (9): io/fs.FS, dockerAvailable(), requireDocker(), StartPostgres(), AssertMigrationRoundTrip(), TestMigrationsAreReversibleAndIdempotent(), TestMigrationsAreReversibleAndIdempotent(), TestMigrationsAreReversibleAndIdempotent() (+1 more)

### Community 157 - "Service"
Cohesion: 0.14
Nodes (17): Profile, testing.F, ListCursor, ListFilters, RegistrationDay, UserStats, FuzzHandlerDecode(), FuzzUserOrderClauseNeverIncludesInput() (+9 more)

### Community 159 - "MigrateUp"
Cohesion: 0.47
Nodes (4): migrateUp(), migrationURL(), trimScheme(), MigrateUp()

### Community 162 - "NewRequestValidator"
Cohesion: 0.31
Nodes (6): github.com/getkin/kin-openapi/routers.Router, RequestValidator, NewRequestValidator(), TestRequestValidatorAcceptsRegisterBody(), TestRequestValidatorPreservesBodyLimitError(), TestRequestValidatorRejectsUndeclaredBody()

### Community 164 - "Testing & QA"
Cohesion: 0.25
Nodes (7): Commands, Conditional tools, Coverage policy, Mutation testing spike, Requirement evidence, Test naming and data, Testing & QA

### Community 165 - "NewGormLogger"
Cohesion: 0.29
Nodes (6): gorm.io/gorm/logger.Interface, gorm.io/gorm/logger.LogLevel, NewGormLogger(), TestPostgresHarnessBootsAndServesQueries(), TestRedisHarnessBootsAndServesLocks(), newSilentGormLogger()

### Community 166 - "users/gen/gen.go"
Cohesion: 0.06
Nodes (29): ListUsersParamsCount, ListUsersParamsLimit, ListUsersParamsOrder, ListUsersParamsPresence, ListUsersParamsSort, ProfileStatus, ResizeAvatarMultipartBody, ResizeAvatarMultipartRequestBody (+21 more)

### Community 167 - "Handlers"
Cohesion: 0.11
Nodes (11): ctxKeyEmail, ctxKeyPerms, AuthorizeResource(), Handlers, Service, validator.Validate, NewHandlers(), EmailFromContext() (+3 more)

### Community 175 - "time.Duration"
Cohesion: 0.14
Nodes (19): time.Duration, redis.Client, NewLeaderElector(), redis.Client, TryDistributedLock(), readSlowRequestThreshold(), DistributedLock, LeaderElector (+11 more)

### Community 176 - "net/http.Handler"
Cohesion: 0.54
Nodes (8): net/http.Handler, chi.Router, ChiServerOptions, ServerInterface, Handler(), HandlerFromMux(), HandlerFromMuxWithBaseURL(), HandlerWithOptions()

### Community 181 - "main"
Cohesion: 0.17
Nodes (12): redis.Client, NewScheduler(), RecordHousekeeping(), Scheduler, MigrateUp(), migrationURL(), trimScheme(), closeDB() (+4 more)

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

### Community 196 - "time.Time"
Cohesion: 0.10
Nodes (16): Permission, Role, Session, time.Time, PermissionInfo, permissionRow, UserCreatedEvent, Session (+8 more)

### Community 197 - "Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md

### Community 200 - "newRBACFixture"
Cohesion: 0.43
Nodes (6): qaLogger, Service, newRBACFixture(), roleBuilder(), TestAssignDefaultRoleIsIdempotent(), TestPermissionAndRoleAssignmentIntegration()

### Community 203 - "Architecture & scalability engineering"
Cohesion: 0.33
Nodes (5): Architecture & scalability engineering, Contracts, data flow, and projections, Edge and infrastructure, Extension points and services, Fitness gates

### Community 204 - "ResizeAvatar"
Cohesion: 0.47
Nodes (5): image/color.Color, io.Reader, blendWhite(), platformBadAvatar(), ResizeAvatar()

### Community 208 - "check-template-drift.mjs"
Cohesion: 0.33
Nodes (5): contractServices, missing, required, root, servicesDir

### Community 210 - "Q: Implement all Engineering items in Architecture & Scalability from docs/BACKLOG.md"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in Architecture & Scalability from docs/BACKLOG.md, Source Nodes

### Community 211 - "check-architecture.mjs"
Cohesion: 0.40
Nodes (3): root, servicesRoot, violations

## Knowledge Gaps
- **698 isolated node(s):** `Contracts, data flow, and projections`, `Extension points and services`, `Edge and infrastructure`, `Fitness gates`, `Answer` (+693 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `Contracts Pipeline (spec-first)` to `net/http.Request`, `Publish`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Contracts Pipeline (spec-first)` connect `Contracts Pipeline (spec-first)` to `ARCHITECTURE overview`, `Security Posture`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `Contracts, data flow, and projections`, `Extension points and services`, `Edge and infrastructure` to the rest of the system?**
  _698 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Service` be split into smaller, more focused modules?**
  _Cohesion score 0.11717171717171718 - nodes in this community are weakly interconnected._
- **Should `net/http.Request` be split into smaller, more focused modules?**
  _Cohesion score 0.056886898096304594 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `ui-system.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._