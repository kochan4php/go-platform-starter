# Graph Report - go-platform-starter  (2026-08-31)

## Corpus Check
- 458 files · ~240,443 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3150 nodes · 5641 edges · 264 communities (209 shown, 55 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 264 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- newFixture
- Service
- net/http.Request
- **/gen/**
- devDependencies
- ui.tsx
- devDependencies
- auth-ui.tsx
- auth service (base mesh)
- ui/package.json
- index.ts
- Route
- resilientTransport
- UsersPage.tsx
- formatter
- middleware.go
- adr/README.md
- auth service API (OpenAPI doc)
- ErrBadRequest
- Client
- _template/gen/gen.go
- What You Must Do When Invoked
- auth/gen/gen.go
- scripts
- rbac/gen/gen.go
- WriteError
- compilerOptions
- compilerOptions
- compilerOptions
- compilerOptions
- Consumer
- log/slog.Logger
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
- gorm.io/gorm.DB
- resilience-drill.sh
- BACKLOG (1.202 improvement items)
- compilerOptions
- RBAC permission/role catalog API
- generate-docs.mjs
- Security Posture
- InitTracer
- index.tsx
- /graphify Skill Command
- DashboardShell.tsx
- e2e-mesh.sh
- template-service Deployment
- web-admin-users/package.json
- renovate.json
- deploy.sh
- dbdocs/main.go
- remotes.d.ts
- App.tsx
- .RegisterWithSub
- Handlers
- main.tsx
- auth
- main
- e2e_test.go
- CONTRIBUTING.md
- rbac Deployment
- users Deployment
- scripts
- schemas.ts
- terser
- gen.d.ts
- check-deps.mjs
- template docker-compose app service
- Schema registry and data dictionary
- MockIntersectionObserver
- MockIntersectionObserver
- web/package.json
- TestRoomsBroadcastDenyAndForceLogoutKick
- MockIntersectionObserver
- main
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
- generate-contract-modules.mjs
- main
- errorreporter.go
- OpenDatabase
- graphify reference: query, path, explain
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- main
- graphify reference: GitHub clone and cross-repo merge
- @tailwindcss/vite
- @types/react-dom
- typescript
- .ListUsers
- vitest
- config-entrypoint.sh
- Reliability & Resilience
- graphify reference: transcribe video and audio
- @testing-library/react
- NewGormLogger
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
- check-migrations.mjs
- extraction-spec.md
- debugRequest
- Contracts Pipeline (spec-first)
- ScalarHandlers
- Publish
- StartPostgres
- context.Context
- @tailwindcss/vite
- Data and migration operations
- AUTH_UX.md
- NewRequestValidator
- Testing & QA
- ClaimsClient
- users/gen/gen.go
- Handlers
- BREAK_GLASS.md
- PENTEST_CHECKLIST.md
- DECISIONS.md
- pre-commit
- annotate-deploy.sh
- index.md
- api-changelog.mjs
- mailer.go
- FrontendErrors
- performance.js
- redis-bigkeys.sh
- main
- ParseAccessTokenRing
- K6.md
- check-contracts.mjs
- auth/internal/handlers.go
- openapi-fuzz.mjs
- TestDatabaseTimeoutsPreserveDSN
- contextLevelHandler
- ProxyHandler
- backup.sh
- check-migration-safety.sh
- time.Duration
- restore-test.sh
- WebVitals
- validateProfileFields
- Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md
- SpecRouteTable
- chaos-qa.sh
- newRBACFixture
- StartRedis
- @vitejs/plugin-react
- Architecture & scalability engineering
- ResizeAvatar
- Schema governance audit
- check-template-drift.mjs
- Q: Implement all Engineering items in Architecture & Scalability from docs/BACKLOG.md
- check-architecture.mjs
- github.com/oapi-codegen/runtime/types.Email
- MiddlewareRegistry
- Q: Implement all Engineering items in the Data & Migrations backlog
- RunBackfill
- Frequently asked questions
- useToast
- pull_request_template.md
- Profile
- envelope.go
- statusRecorder
- rbac
- API curl examples
- users
- RequiredHeaderError
- README.md
- db-maintenance.sh
- mask-data.sh
- migration-dry-run.sh
- schema-drift.sh
- biome.json
- Postmortem
- ignore
- webhook.go
- LoadDotEnv
- health.go
- linter
- ErrNotFound
- @types/react
- Observability
- AuditViewer
- API contract standards
- Q: Implement all Engineering items in the API & Contracts backlog
- Troubleshooting
- API_SCHEMA_AUDIT.md
- net/http.Handler
- ConsumeUserEvents
- check-docs.mjs
- Operational runbook
- [Unreleased]
- Incident response playbook
- Q: Implement all Engineering items in Docs & Governance plus decisions N8, N29, and N49
- record-quickstart.mjs
- chiRouteContext
- platform
- ARCHIVE_POLICY.md
- Direct dependency licenses
- Capacity and cost planning
- TestDynamicRoutingConfiguration
- fail
- GLOSSARY.md
- LEARNING.md

## God Nodes (most connected - your core abstractions)
1. `WriteError()` - 51 edges
2. `OK()` - 49 edges
3. `Service` - 45 edges
4. `ErrBadRequest()` - 31 edges
5. `Handlers` - 30 edges
6. `main()` - 30 edges
7. `useToast()` - 27 edges
8. `Consumer` - 27 edges
9. `main()` - 26 edges
10. `Service` - 25 edges

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

## Communities (264 total, 55 thin omitted)

### Community 0 - "newFixture"
Cohesion: 0.18
Nodes (22): capturedEvent, capturedPublisher, fixture, redis.Client, indexOf(), mustRegister(), newFixture(), resetTokenFromMail() (+14 more)

### Community 1 - "Service"
Cohesion: 0.11
Nodes (14): AuthResult, ActiveSecret(), Session, TokenIntrospection, User, findUserByEmail(), ErrBadCredentials(), Config (+6 more)

### Community 2 - "net/http.Request"
Cohesion: 0.06
Nodes (13): net/http.Request, net/http.ResponseWriter, ServerInterfaceWrapper, Unimplemented, MiddlewareFunc, ServerInterfaceWrapper, Unimplemented, MiddlewareFunc (+5 more)

### Community 3 - "**/gen/**"
Cohesion: 0.12
Nodes (9): AuthPaths, GatewayPaths, PlatformPaths, RbacPaths, RealtimePaths, TemplatePaths, UsersPaths, WorkerPaths (+1 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui, @tanstack/react-query, devDependencies (+39 more)

### Community 5 - "ui.tsx"
Cohesion: 0.08
Nodes (27): el, qc, el, qc, deleteMock, getMock, HealthState, Theme (+19 more)

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
Nodes (36): description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react, @types/react-dom (+28 more)

### Community 10 - "index.ts"
Cohesion: 0.08
Nodes (29): api, AuthContext, AuthProvider(), CopyErrorButton(), Props, RemoteErrorBoundary, State, addBreadcrumb() (+21 more)

### Community 11 - "Route"
Cohesion: 0.25
Nodes (5): Route, Upstreams, Config, Matcher, ParseUpstreams()

### Community 12 - "resilientTransport"
Cohesion: 0.12
Nodes (21): context.CancelFunc, io.ReadCloser, net/http.Header, net/http.Response, net/url.URL, sync/atomic.Uint64, bufferedWriter, cachedResponse (+13 more)

### Community 13 - "UsersPage.tsx"
Cohesion: 0.09
Nodes (33): ActivityFeed(), ActivityItem, ColumnKey, columnLabel(), copyText(), csvCell(), dateBoundary(), DEFAULT_COLUMNS (+25 more)

### Community 14 - "formatter"
Cohesion: 0.20
Nodes (10): enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript, formatter, globals (+2 more)

### Community 15 - "middleware.go"
Cohesion: 0.18
Nodes (15): CorrelationID(), LoggerFromContext(), newRequestID(), readSlowRequestThreshold(), Recoverer(), RequestIDFromContext(), RequestLogger(), sampleAccessLog() (+7 more)

### Community 16 - "adr/README.md"
Cohesion: 0.09
Nodes (18): ADR-0002: Integer identities, Consequences, Context, Decision, ADR-0004: Consolidated migration baseline, Consequences, Context, Decision (+10 more)

### Community 17 - "auth service API (OpenAPI doc)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "ErrBadRequest"
Cohesion: 0.10
Nodes (25): BulkPermissionResult, Loggerish, PermissionInfo, ErrBadRequest(), ErrConflict(), Role, RoleInput, userRole (+17 more)

### Community 19 - "Client"
Cohesion: 0.14
Nodes (8): sync.RWMutex, Client, prometheusGauge, contains(), jsonMarshal(), Hub, NewHub(), TokenFromHandshake()

### Community 20 - "_template/gen/gen.go"
Cohesion: 0.11
Nodes (16): chi.Router, ChiServerOptions, EnvelopeOK, InvalidParamFormatError, MiddlewareFunc, RequiredHeaderError, RequiredParamError, ServerInterface (+8 more)

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "auth/gen/gen.go"
Cohesion: 0.06
Nodes (24): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, AdminSetUserStateJSONBody, AdminSetUserStateJSONBodyStatus, AdminSetUserStateJSONRequestBody, ChangePasswordJSONBody, ChangePasswordJSONRequestBody, ConfirmPasswordJSONBody (+16 more)

### Community 23 - "scripts"
Cohesion: 0.06
Nodes (35): @axe-core/playwright, @biomejs/biome, devDependencies, @axe-core/playwright, @biomejs/biome, js-yaml, @playwright/test, @stoplight/spectral-cli (+27 more)

### Community 24 - "rbac/gen/gen.go"
Cohesion: 0.07
Nodes (28): BulkCreatePermissionsJSONBody, BulkCreatePermissionsJSONRequestBody, CreatePermissionJSONBody, CreatePermissionJSONRequestBody, Permission, Role, RoleInput, SetUserRolesJSONBody (+20 more)

### Community 25 - "WriteError"
Cohesion: 0.16
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
Cohesion: 0.11
Nodes (14): Consumer, WorkerHandler, redis.XMessage, contains(), freshMarkers(), redis.Client, handlerKey(), handlerName() (+6 more)

### Community 31 - "log/slog.Logger"
Cohesion: 0.18
Nodes (13): log/slog.Logger, Hub, withBaseLogger(), chi.Router, NewRouter(), Handlers, NewHandlers(), NewHandlersWithKeyRing() (+5 more)

### Community 32 - "dev-all.sh"
Cohesion: 0.15
Nodes (22): ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra(), DATABASE_URL, die(), docker_publishes() (+14 more)

### Community 33 - "check-coverage.mjs"
Cohesion: 0.11
Nodes (16): badgeDir, byPackage, changed, changedLines, changedRows, changedScore, listed, merged (+8 more)

### Community 34 - "On-call alert runbook"
Cohesion: 0.12
Nodes (16): AuthLoginFailureRate, AuthSessionErrors, CertificateExpiresSoon, FrontendErrorBurst, HostDiskSpaceLow, MailQueueBacklog, On-call alert runbook, PlatformErrorRateAnomaly (+8 more)

### Community 35 - "Migrate"
Cohesion: 0.14
Nodes (8): main(), Migrate(), migrationURL(), TestMigrationURLUsesServiceHistory(), MigrateUp(), migrateUp(), migrateUp(), MigrateUp()

### Community 36 - "web (host shell) Docker Compose Service"
Cohesion: 0.10
Nodes (20): web-admin-roles Kubernetes Deployment, web-admin-roles HorizontalPodAutoscaler, web-admin-roles Kubernetes Service, web-admin-roles Docker Compose Service, web-admin-roles Dev HTML Entry, web-admin-users Kubernetes Deployment, web-admin-users HorizontalPodAutoscaler, web-admin-users Kubernetes Service (+12 more)

### Community 37 - "contracts/package.json"
Cohesion: 0.06
Nodes (33): openapi-fetch, openapi-typescript, dependencies, openapi-fetch, zod, description, devDependencies, js-yaml (+25 more)

### Community 38 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, gsap, @gsap/react, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui (+9 more)

### Community 39 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, @testing-library/react, @testing-library/user-event, @types/react (+9 more)

### Community 40 - "ARCHITECTURE overview"
Cohesion: 0.11
Nodes (16): ARCHITECTURE overview, Gateway Topology, JWT Verified Once At Edge, Observability Flow, Backlog: Observability, Login and authorization, Refresh-token rotation and reuse detection, Registration and projection materialization (+8 more)

### Community 41 - "go-platform-starter README Overview"
Cohesion: 0.19
Nodes (16): User Taste Profile, CI: commitlint job, CI: go job (lint/build/test/contracts), CI: playwright smoke job, CI: security (Trivy + Semgrep) job, CI: web job (lint/test/build/budget), CI Workflow, release-please job (+8 more)

### Community 42 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @phosphor-icons/react, react, react-dom, react-router-dom, @starter/contracts, @starter/ui, @tanstack/react-query (+7 more)

### Community 43 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 44 - "gorm.io/gorm.DB"
Cohesion: 0.12
Nodes (17): gorm.io/gorm.DB, redis.Client, PublishWithAuditOutbox(), RedisPublisher, redis.Client, MigrateUp(), ConsumeUserEvents(), redis.Client (+9 more)

### Community 45 - "resilience-drill.sh"
Cohesion: 0.12
Nodes (14): v6 Definition of Done, DoD Wave Gates (0-7), Definition of done by work type, Engineering guide, Git workflow, Go standards, Naming, Review guide (+6 more)

### Community 46 - "BACKLOG (1.202 improvement items)"
Cohesion: 0.08
Nodes (33): ADR-0001: Fresh-build Pivot, GORM Replaces sqlc/pgx-direct, Schema-per-Service Decision, Redis Streams Event Backbone, Schema-per-Service Data Ownership, BACKLOG (1.202 improvement items), Backlog: Architecture & Scalability, Backlog: CI/CD & Release (+25 more)

### Community 47 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+5 more)

### Community 48 - "RBAC permission/role catalog API"
Cohesion: 0.14
Nodes (14): rbac codegen config, RBAC permission/role catalog API, resolveClaims internal endpoint, realtimeInfo endpoint (ws url/protocol), users codegen config, users Profile CRUD API, worker Deployment, worker HorizontalPodAutoscaler (+6 more)

### Community 49 - "generate-docs.mjs"
Cohesion: 0.10
Nodes (15): byTag, check, composeFiles, directGo, envFiles, envRows, generated, goModules (+7 more)

### Community 50 - "Security Posture"
Cohesion: 0.21
Nodes (12): Backlog: Security, Identity-Header Contract, Hardening Extras Found During Execution, Security Posture, CSRF Mitigation by Construction, Security Headers Policy, Security Scanning (gosec/Trivy/semgrep), Secrets Management (+4 more)

### Community 51 - "InitTracer"
Cohesion: 0.22
Nodes (11): go.opentelemetry.io/otel/sdk/resource.Resource, TestTraceAndBaggageMapRoundTrip(), ExtractTraceMap(), InitTracer(), InjectTraceMap(), newResource(), TraceIDFromContext(), traceSampleRatio() (+3 more)

### Community 52 - "index.tsx"
Cohesion: 0.05
Nodes (44): api, PermissionInfo, Role, AuditEntry, download(), exportMatrixPng(), iconGlyphs, iconNames (+36 more)

### Community 53 - "/graphify Skill Command"
Cohesion: 0.20
Nodes (11): Graphify Skill-Trigger Directive, Add & Watch Reference Doc, Exports & Benchmark Reference Doc, Extraction Subagent Prompt Spec, GitHub Clone & Cross-Repo Merge Reference Doc, Commit Hook & CLAUDE.md Integration Reference Doc, Query/Path/Explain Reference Doc, Transcribe Video/Audio Reference Doc (+3 more)

### Community 54 - "DashboardShell.tsx"
Cohesion: 0.05
Nodes (39): Root(), applyTheme(), useGatewayHealth(), useTheme(), OfflineBanner(), SessionExpiringBanner(), CommandPalette(), CommandPaletteProps (+31 more)

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

### Community 62 - "App.tsx"
Cohesion: 0.07
Nodes (29): AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), handleLoggedIn(), handleReauthenticated(), LoginPage, LoginResult (+21 more)

### Community 63 - ".RegisterWithSub"
Cohesion: 0.19
Nodes (12): github.com/lib/pq.StringArray, passwordRecord, checkHIBP(), hashPassword(), passwordHistoryContains(), passwordNeedsRehash(), sha1Hex(), validatePasswordComplexity() (+4 more)

### Community 64 - "Handlers"
Cohesion: 0.22
Nodes (4): DeleteRoleParams, Handlers, Service, NewHandlers()

### Community 65 - "main.tsx"
Cohesion: 0.21
Nodes (8): App(), observeWebVitals(), rating(), report(), VitalName, el, worker, handlers

### Community 66 - "auth"
Cohesion: 0.10
Nodes (20): adminListUserSessions, adminRevokeUserSession, adminRevokeUserSessions, adminSetUserPassword, adminSetUserState, auth, beginMFA, changePassword (+12 more)

### Community 67 - "main"
Cohesion: 0.13
Nodes (18): NewLogger(), parseLogLevel(), redis.Client, NewRedisClient(), WaitForRedis(), GracefulRun(), shutdownTimeout(), config (+10 more)

### Community 68 - "e2e_test.go"
Cohesion: 0.31
Nodes (12): envelope, proc, os/exec.Cmd, buildBinaries(), call(), flattenEnv(), freePort(), login() (+4 more)

### Community 69 - "CONTRIBUTING.md"
Cohesion: 0.20
Nodes (8): Change workflow, Contributing, Pull requests, Required local checks, Start here, Reporting a vulnerability, Security policy, Supported versions

### Community 70 - "rbac Deployment"
Cohesion: 0.29
Nodes (7): rbac Deployment, rbac HorizontalPodAutoscaler, rbac migrate Job, rbac Service, rbac compose postgres, rbac compose redis, rbac compose service

### Community 71 - "users Deployment"
Cohesion: 0.29
Nodes (7): users Deployment, users HorizontalPodAutoscaler, users migrate Job, users Service, users compose postgres, users compose redis, users compose service

### Community 72 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, check:budget, dev, preview, test

### Community 73 - "schemas.ts"
Cohesion: 0.12
Nodes (15): adminSetUserPasswordSchema, adminSetUserStateSchema, bulkCreatePermissionsSchema, changePasswordSchema, confirmPasswordSchema, createPermissionSchema, createRoleSchema, createUserProfileSchema (+7 more)

### Community 75 - "gen.d.ts"
Cohesion: 0.29
Nodes (6): RFC-9745, components, $defs, operations, paths, webhooks

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

### Community 82 - "TestRoomsBroadcastDenyAndForceLogoutKick"
Cohesion: 0.26
Nodes (11): github.com/coder/websocket.Conn, net/http/httptest.Server, dialWS(), mint(), readMsg(), send(), TestRoomsBroadcastDenyAndForceLogoutKick(), redis.Client (+3 more)

### Community 84 - "main"
Cohesion: 0.36
Nodes (9): config, jobConfig, closeDB(), envFile(), redis.Client, main(), parseJobs(), pingDB() (+1 more)

### Community 85 - "newUsersFixture"
Cohesion: 0.29
Nodes (9): profileOption, Profile, redis.Client, Service, newUsersFixture(), profileBuilder(), TestGoldenUsersFixture(), TestUsersCRUDValidationPresenceAndBoundaries() (+1 more)

### Community 86 - "compose-specs.mjs"
Cohesion: 0.20
Nodes (10): audit, contractPackage, definedTags, enrichOperation(), exampleFor(), merged, methods, outDir (+2 more)

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
Cohesion: 0.12
Nodes (18): testing.B, time.Time, ListCursor, ListFilters, permissionRow, BenchmarkWriteJSON(), profileInput, sessionView (+10 more)

### Community 91 - "startFixture"
Cohesion: 0.21
Nodes (19): recordingMailer, closeDB(), fixture, redis.Client, openDB(), publish(), retryUntil(), startFixture() (+11 more)

### Community 94 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 95 - "generate-contract-modules.mjs"
Cohesion: 0.17
Nodes (10): generatedFiles, methods, pathsByTag, resolve(), root, schemasOutput, source, spec (+2 more)

### Community 96 - "main"
Cohesion: 0.12
Nodes (15): cachedClaims, claimEntry, NewClaimsClient(), SweepSessions(), randomToken(), RegisterSessionMetrics(), CalibrateBcryptCost(), RandomPassword() (+7 more)

### Community 97 - "errorreporter.go"
Cohesion: 0.33
Nodes (5): InitErrorReporter(), ReportError(), toError(), ErrorReporter, noopReporter

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

### Community 103 - "main"
Cohesion: 0.24
Nodes (16): consumerQuotaPolicy, ctxKeyAuth, net/netip.Prefix, Fail(), TestFailEnvelopeShape(), redis_rate.Limiter, clientIP(), corsHandler() (+8 more)

### Community 108 - ".ListUsers"
Cohesion: 0.31
Nodes (5): ListOK(), SetPaginationLinks(), listData, Meta, ListRoleUsersParams

### Community 111 - "Reliability & Resilience"
Cohesion: 0.14
Nodes (12): Backup, Backup and restore, Disaster recovery, Policy, Restore rehearsal, Backup and disaster recovery, Deliberate non-mechanisms, Deployment safety (+4 more)

### Community 114 - "NewGormLogger"
Cohesion: 0.15
Nodes (9): gorm.io/gorm/logger.Interface, gorm.io/gorm/logger.LogLevel, NewGormLogger(), queryOperation(), slowQuerySampled(), TestPostgresHarnessBootsAndServesQueries(), TestRedisHarnessBootsAndServesLocks(), GormLogger (+1 more)

### Community 142 - "testing.T"
Cohesion: 0.08
Nodes (29): net/http.Transport, testing.T, discardLogger(), TestEnvelopeGoldenFile(), TestGormLoggerTrace(), TestListOKShape(), TestOKEnvelopeShape(), TestPaginationLinks() (+21 more)

### Community 150 - "check-migrations.mjs"
Cohesion: 0.29
Nodes (12): [command = "check", argument], digest(), fail(), files, lint(), manifestPath, migrationFiles(), pathOf() (+4 more)

### Community 152 - "debugRequest"
Cohesion: 0.24
Nodes (7): recordAPIError(), recordBuildInfo(), DebugRequest(), debugRequest(), TestDebugRequestRejectsInvalidToken(), TestDebugRequestRequiresOperatorToken(), TestRuntimeProcessAndBuildCollectorsAreRegistered()

### Community 153 - "Contracts Pipeline (spec-first)"
Cohesion: 0.08
Nodes (28): Ops Files Per Component, Spec-First Without a Behavioral Contract, API Versioning Policy, Deliberately Avoided Versioning Practices, Deprecation Mechanics (RFC-9745), /api/v1 Frozen Contract, Adding v2 API Strategy, Fail-Closed Route Registry (+20 more)

### Community 154 - "ScalarHandlers"
Cohesion: 0.40
Nodes (3): AggregateDocs(), ScalarHandlers(), TestScalarPageHasExecutableCSPAndSRI()

### Community 155 - "Publish"
Cohesion: 0.21
Nodes (13): MFAEnrollment, DecryptForSubject(), DeriveKey(), EncryptForSubject(), KeyedDigest(), VerifyDigest(), TestSecurityPrimitives(), TestStreamMessageSigningAndEncryption() (+5 more)

### Community 156 - "StartPostgres"
Cohesion: 0.18
Nodes (9): io/fs.FS, dockerAvailable(), requireDocker(), StartPostgres(), AssertMigrationRoundTrip(), TestMigrationsAreReversibleAndIdempotent(), TestMigrationsAreReversibleAndIdempotent(), TestMigrationsAreReversibleAndIdempotent() (+1 more)

### Community 157 - "context.Context"
Cohesion: 0.11
Nodes (18): context.Context, Audit(), Loggerish, AuditEvent, StreamPublisher, RunSeedVersion(), RegistrationDay, userAuditPublisher (+10 more)

### Community 159 - "Data and migration operations"
Cohesion: 0.18
Nodes (10): Backfills and seeds, Backup, PITR, masking, and recovery, Data and migration operations, Growth, archive, and purge, Index, integrity, and vacuum operations, Query review and budgets, Required migration workflow, Rollback playbook (+2 more)

### Community 162 - "NewRequestValidator"
Cohesion: 0.25
Nodes (7): github.com/getkin/kin-openapi/routers.Router, RequestValidator, NewRequestValidator(), TestRequestValidatorAcceptsRegisterBody(), TestRequestValidatorPreservesBodyLimitError(), TestRequestValidatorRejectsUndeclaredBody(), TestRuntimeResponseMatchesOpenAPI()

### Community 164 - "Testing & QA"
Cohesion: 0.25
Nodes (7): Commands, Conditional tools, Coverage policy, Mutation testing spike, Requirement evidence, Test naming and data, Testing & QA

### Community 165 - "ClaimsClient"
Cohesion: 0.22
Nodes (5): container/list.Element, container/list.List, sync.Mutex, ClaimsClient, qaPublisher

### Community 166 - "users/gen/gen.go"
Cohesion: 0.06
Nodes (30): ListUsersParamsCount, ListUsersParamsInclude, ListUsersParamsLimit, ListUsersParamsOrder, ListUsersParamsPresence, ListUsersParamsSort, MeParamsInclude, ResizeAvatarMultipartBody (+22 more)

### Community 167 - "Handlers"
Cohesion: 0.11
Nodes (10): ctxKeyEmail, ctxKeyPerms, AuthorizeResource(), MeParams, Handlers, validator.Validate, EmailFromContext(), ctxKeySub (+2 more)

### Community 170 - "DECISIONS.md"
Cohesion: 0.11
Nodes (13): Contributor Covenant Code of Conduct, Expected behavior, Our pledge, Scope and enforcement, Cadence, Collaboration and knowledge sharing, Pair and mob programming, Decision log (+5 more)

### Community 174 - "index.md"
Cohesion: 0.09
Nodes (15): Build and operate, go-platform-starter documentation, Govern, Start, Service ownership, Bundle audit, Performance engineering evidence, Environment variable reference (+7 more)

### Community 175 - "api-changelog.mjs"
Cohesion: 0.17
Nodes (10): added, after, before, changed, current, methods, previous, removed (+2 more)

### Community 176 - "mailer.go"
Cohesion: 0.20
Nodes (10): net/smtp.Auth, BuildMIME(), Mail, Mailer, NewMailer(), TestBuildMIME(), ConsoleMailer, FallbackMailer (+2 more)

### Community 177 - "FrontendErrors"
Cohesion: 0.60
Nodes (3): frontendError, FrontendErrors(), validFrontendError()

### Community 181 - "main"
Cohesion: 0.22
Nodes (9): redis.Client, NewScheduler(), RecordHousekeeping(), Scheduler, closeDB(), envFile(), main(), pingDB() (+1 more)

### Community 182 - "ParseAccessTokenRing"
Cohesion: 0.29
Nodes (8): jwt.RegisteredClaims, ParseAccessToken(), ParseAccessTokenRing(), ParseSigningKeys(), AccessClaims, SigningKeys, HasPerm(), ParseAccess()

### Community 184 - "check-contracts.mjs"
Cohesion: 0.14
Nodes (12): calls, clientSource, contractPackage, errorSource, failures, generated, goCodes, methods (+4 more)

### Community 185 - "auth/internal/handlers.go"
Cohesion: 0.17
Nodes (10): ctxKeyHash, forgotInput, loginInput, registerInput, resetInput, RequireSessionIdentity(), clientIP(), ctxKeySub (+2 more)

### Community 186 - "openapi-fuzz.mjs"
Cohesion: 0.40
Nodes (4): base, crashes, payloads, spec

### Community 187 - "TestDatabaseTimeoutsPreserveDSN"
Cohesion: 0.40
Nodes (3): FeatureEnabled(), TestDatabaseTimeoutsPreserveDSN(), TestFeatureEnabled()

### Community 188 - "contextLevelHandler"
Cohesion: 0.19
Nodes (10): log/slog.Attr, log/slog.Handler, log/slog.Level, log/slog.LevelVar, log/slog.Record, levelName(), maskPII(), scrubLogAttr() (+2 more)

### Community 189 - "ProxyHandler"
Cohesion: 0.29
Nodes (8): ProxyDeps, serviceStatus, clearIdentity(), redis.Client, LoadSpecs(), primaryEndpoint(), ProxyHandler(), StatusPage()

### Community 193 - "time.Duration"
Cohesion: 0.14
Nodes (18): time.Duration, redis.Client, NewLeaderElector(), redis.Client, TryDistributedLock(), DistributedLock, LeaderElector, Config (+10 more)

### Community 196 - "validateProfileFields"
Cohesion: 0.24
Nodes (8): testing.F, ValidatePublicHTTPSURL(), FuzzUserOrderClauseNeverIncludesInput(), FuzzValidateProfileFields(), TestProfileSecurityValidation(), TestUserOrderClause(), userOrderClause(), validateProfileFields()

### Community 197 - "Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md

### Community 198 - "SpecRouteTable"
Cohesion: 0.33
Nodes (5): All(), IsValid(), MustValid(), TestSpecRouteTableSupportsHeadAndDeprecation(), SpecRouteTable()

### Community 200 - "newRBACFixture"
Cohesion: 0.33
Nodes (8): qaLogger, RoleInput, Service, newRBACFixture(), roleBuilder(), TestAssignDefaultRoleIsIdempotent(), TestPermissionAndRoleAssignmentIntegration(), TestSeedCatalogIsVersionedAndIdempotent()

### Community 201 - "StartRedis"
Cohesion: 0.17
Nodes (13): TestDistributedLockOwnershipAndRenewal(), TestLeaderElectionAllowsOneActiveLeader(), TestSchedulerSingleRunnerAndPanicSafety(), TestUserLifecycleTransitions(), ValidateUserTransition(), StartRedis(), UserStatus, NewMatcher() (+5 more)

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

### Community 212 - "github.com/oapi-codegen/runtime/types.Email"
Cohesion: 0.20
Nodes (9): ForgotInput, LoginInput, Profile, ProfileInput, ProfileStatus, ProfileUpdateInput, RegisterInput, github.com/oapi-codegen/runtime/types.Email (+1 more)

### Community 213 - "MiddlewareRegistry"
Cohesion: 0.60
Nodes (3): Middleware, MiddlewareRegistry, NewMiddlewareRegistry()

### Community 214 - "Q: Implement all Engineering items in the Data & Migrations backlog"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in the Data & Migrations backlog, Source Nodes

### Community 215 - "RunBackfill"
Cohesion: 0.50
Nodes (3): RunBackfill(), TestRunBackfillRejectsInvalidCount(), TestRunBackfillStopsAfterPartialBatch()

### Community 216 - "Frequently asked questions"
Cohesion: 0.13
Nodes (13): ADR-0003: Move profile data to the users schema, Consequences, Context, Decision, Can I edit an existing migration?, Frequently asked questions, How are generated files handled?, Is multi-region enabled? (+5 more)

### Community 217 - "useToast"
Cohesion: 0.24
Nodes (9): DeleteRoleModal(), RoleModal(), Probe(), SessionMenu(), timezoneOptions(), useConfirm(), useDrawer(), usePreferences() (+1 more)

### Community 218 - "pull_request_template.md"
Cohesion: 0.40
Nodes (4): Change, Impact and delivery, Release notes draft, SQL / migration review

### Community 219 - "Profile"
Cohesion: 0.33
Nodes (4): Profile, RoleSummary, Config, RoleSummary

### Community 220 - "envelope.go"
Cohesion: 0.50
Nodes (3): WriteJSON(), failEnvelope, okEnvelope

### Community 222 - "rbac"
Cohesion: 0.14
Nodes (14): bulkCreatePermissions, createPermission, createRole, deletePermission, deleteRole, getUserRoles, listPermissions, listRoles (+6 more)

### Community 223 - "API curl examples"
Cohesion: 0.17
Nodes (11): aggregateSpec, API curl examples, exportAuditEntries, gateway, listAuditEntries, ping, realtime, realtimeInfo (+3 more)

### Community 224 - "users"
Cohesion: 0.18
Nodes (11): createUserProfile, deleteUser, eraseMe, exportMyData, getUser, getUserStats, listUsers, me (+3 more)

### Community 231 - "biome.json"
Cohesion: 0.22
Nodes (8): files, organizeImports, enabled, $schema, vcs, clientKind, enabled, useIgnoreFile

### Community 232 - "Postmortem"
Cohesion: 0.20
Nodes (10): Actions, Contributing factors, Detection, Postmortem, Resolution and recovery, Root cause, SLO and error-budget impact, Summary and customer impact (+2 more)

### Community 233 - "ignore"
Cohesion: 0.22
Nodes (9): ignore, .claude/**, .codex/**, **/coverage/**, **/dist/**, docs/BACKLOG.md, graphify-out/**, **/node_modules/** (+1 more)

### Community 234 - "webhook.go"
Cohesion: 0.29
Nodes (7): net/http.Client, HTTPWebhookProvider, recordingWebhook, WebhookDelivery, WebhookProvider, allowedWebhookHost(), NewHTTPWebhookProvider()

### Community 235 - "LoadDotEnv"
Cohesion: 0.24
Nodes (8): LoadDotEnv(), loadSecretFiles(), MustParseEnv(), TestLoadDotEnv(), TestSecretFileEnvAdapterIgnoresOptionalAppEnvFile(), envGet(), writeFile(), T

### Community 236 - "health.go"
Cohesion: 0.39
Nodes (7): buildValue(), Drain(), Healthz(), Readyz(), Version(), TestHealthDetailAndVersion(), Checker

### Community 237 - "linter"
Cohesion: 0.33
Nodes (6): linter, enabled, rules, recommended, style, useNodejsImportProtocol

### Community 238 - "ErrNotFound"
Cohesion: 0.29
Nodes (7): ErrForbidden(), ErrInternal(), ErrNotFound(), ErrUnauthorized(), AppError, TestWriteErrorMapping(), ErrConflictEmail()

### Community 240 - "Observability"
Cohesion: 0.22
Nodes (9): Deploy annotations, Observability, Postgres and Redis, Profiling, Run the stack, Sampling and focused debug, SLO and error budget policy, Synthetic and external uptime (+1 more)

### Community 241 - "AuditViewer"
Cohesion: 0.33
Nodes (8): encoding/json.RawMessage, net/http.HandlerFunc, auditRow, ParsePagination(), SecretMatch(), AuditExport(), auditQuery(), AuditViewer()

### Community 242 - "API contract standards"
Cohesion: 0.40
Nodes (4): API contract standards, Platform and event surface, Requests and collections, Responses, caching, and compatibility

### Community 243 - "Q: Implement all Engineering items in the API & Contracts backlog"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in the API & Contracts backlog, Source Nodes

### Community 244 - "Troubleshooting"
Cohesion: 0.25
Nodes (8): Authentication loops or refresh fails, Database or Redis is slow, Gateway rejects a route or refuses to boot, Generated files are stale, Hard refresh returns 404 or loses the session, Local mesh does not start, Tests fail before running containers, Troubleshooting

### Community 246 - "net/http.Handler"
Cohesion: 0.54
Nodes (8): net/http.Handler, chi.Router, ChiServerOptions, ServerInterface, Handler(), HandlerFromMux(), HandlerFromMuxWithBaseURL(), HandlerWithOptions()

### Community 247 - "ConsumeUserEvents"
Cohesion: 0.29
Nodes (6): UserCreatedEvent, ScheduledEvent, UserDeletedEvent, AssignDefaultRole(), ConsumeUserEvents(), redis.Client

### Community 248 - "check-docs.mjs"
Cohesion: 0.29
Nodes (5): failures, ignored, readme, required, root

### Community 249 - "Operational runbook"
Cohesion: 0.33
Nodes (6): Common operations, Escalation and handoff, Operational runbook, Rollback, Service inventory, Triage

### Community 250 - "[Unreleased]"
Cohesion: 0.40
Nodes (4): Added, Changed, Changelog, [Unreleased]

### Community 251 - "Incident response playbook"
Cohesion: 0.40
Nodes (5): Afterward, Incident response playbook, Response, Roles, Severity

### Community 252 - "Q: Implement all Engineering items in Docs & Governance plus decisions N8, N29, and N49"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in Docs & Governance plus decisions N8, N29, and N49, Source Nodes

### Community 253 - "record-quickstart.mjs"
Cohesion: 0.40
Nodes (4): destination, directory, root, video

### Community 254 - "chiRouteContext"
Cohesion: 0.50
Nodes (4): chi.Context, chiRouteContext(), Observe(), Trace()

### Community 255 - "platform"
Cohesion: 0.50
Nodes (4): healthz, platform, readyz, version

### Community 257 - "Direct dependency licenses"
Cohesion: 0.50
Nodes (3): Direct dependency licenses, Go modules, JavaScript packages

### Community 258 - "Capacity and cost planning"
Cohesion: 0.50
Nodes (3): Capacity and cost planning, Capacity worksheet, Monthly cost worksheet

### Community 259 - "TestDynamicRoutingConfiguration"
Cohesion: 0.67
Nodes (3): TestDynamicRoutingConfiguration(), ParseConsumerQuotas(), ParseWebSocketRoutes()

## Knowledge Gaps
- **988 isolated node(s):** `name`, `version`, `private`, `type`, `dev` (+983 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `Contracts Pipeline (spec-first)` to `net/http.Request`, `validateProfileFields`, `ProxyHandler`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Security Posture` connect `Security Posture` to `index.md`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _988 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Service` be split into smaller, more focused modules?**
  _Cohesion score 0.11304347826086956 - nodes in this community are weakly interconnected._
- **Should `net/http.Request` be split into smaller, more focused modules?**
  _Cohesion score 0.05627147766323024 - nodes in this community are weakly interconnected._
- **Should `**/gen/**` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._