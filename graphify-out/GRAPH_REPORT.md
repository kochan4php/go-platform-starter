# Graph Report - go-platform-starter  (2026-08-31)

## Corpus Check
- 458 files · ~240,443 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3143 nodes · 5635 edges · 264 communities (200 shown, 64 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 264 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4100c5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- newFixture
- context.Context
- net/http.Request
- **/gen/**
- devDependencies
- index.tsx
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
- DECISIONS.md
- auth service API (OpenAPI doc)
- ErrBadRequest
- log/slog.Logger
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
- ARCHITECTURE overview
- dev-all.sh
- check-coverage.mjs
- On-call alert runbook
- PublishWithAuditOutbox
- web (host shell) Docker Compose Service
- contracts/package.json
- dependencies
- devDependencies
- System diagrams
- go-platform-starter README Overview
- dependencies
- devDependencies
- RedisPublisher
- Engineering guide
- BACKLOG (1.202 improvement items)
- compilerOptions
- RBAC permission/role catalog API
- generate-docs.mjs
- Security Posture
- InitTracer
- RolesPage.tsx
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
- password.go
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
- gorm.io/gorm.DB
- web/vite.config.ts
- composespec/main.go
- graphify reference: extra exports and benchmark
- generate-contract-modules.mjs
- main
- Recoverer
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
- auth/internal/jwt.go
- vitest
- config-entrypoint.sh
- Reliability & Resilience
- graphify reference: transcribe video and audio
- @testing-library/react
- GormLogger
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
- Unimplemented
- DoD Evidence Checklist
- ScalarHandlers
- Publish
- StartRedis
- Service
- @tailwindcss/vite
- Data and migration operations
- AUTH_UX.md
- serveIdempotent
- Testing & QA
- ClaimsClient
- users/gen/gen.go
- Handlers
- BREAK_GLASS.md
- PENTEST_CHECKLIST.md
- RemoteErrorBoundary.tsx
- pre-commit
- annotate-deploy.sh
- RUNBOOK.md
- api-changelog.mjs
- newResilientTransport
- Contracts Pipeline (spec-first)
- performance.js
- redis-bigkeys.sh
- main
- ParseAccessTokenRing
- K6.md
- check-contracts.mjs
- auth/internal/handlers.go
- openapi-fuzz.mjs
- TestDatabaseTimeoutsPreserveDSN
- NewLogger
- ProxyHandler
- backup.sh
- check-migration-safety.sh
- time.Duration
- restore-test.sh
- WebVitals
- resilience-drill.sh
- Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md
- permissions.go
- chaos-qa.sh
- newRBACFixture
- Audit
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
- NewGormLogger
- pull_request_template.md
- Profile
- Fail
- .seedCatalog
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
- .Kick
- main
- health.go
- linter
- auth/internal/service.go
- @types/react
- Observability
- InvalidParamFormatError
- index.md
- Q: Implement all Engineering items in the API & Contracts backlog
- Troubleshooting
- API_SCHEMA_AUDIT.md
- UnmarshalingParamError
- ConsumeUserEvents
- check-docs.mjs
- UnmarshalingParamError
- [Unreleased]
- InvalidParamFormatError
- Q: Implement all Engineering items in Docs & Governance plus decisions N8, N29, and N49
- record-quickstart.mjs
- UnescapedCookieParamError
- platform
- ARCHIVE_POLICY.md
- Direct dependency licenses
- Capacity and cost planning
- TestDynamicRoutingConfiguration
- fail
- GLOSSARY.md
- LEARNING.md
- UnmarshalingParamError

## God Nodes (most connected - your core abstractions)
1. `WriteError()` - 51 edges
2. `OK()` - 49 edges
3. `Service` - 45 edges
4. `ErrBadRequest()` - 31 edges
5. `main()` - 30 edges
6. `Handlers` - 30 edges
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

## Communities (264 total, 64 thin omitted)

### Community 0 - "newFixture"
Cohesion: 0.18
Nodes (22): capturedEvent, capturedPublisher, fixture, redis.Client, indexOf(), mustRegister(), newFixture(), resetTokenFromMail() (+14 more)

### Community 1 - "context.Context"
Cohesion: 0.15
Nodes (10): context.Context, AuthResult, ActiveSecret(), User, findUserByEmail(), hashPassword(), ErrBadCredentials(), Service (+2 more)

### Community 2 - "net/http.Request"
Cohesion: 0.06
Nodes (12): net/http.Request, net/http.ResponseWriter, ServerInterfaceWrapper, Unimplemented, MiddlewareFunc, ServerInterfaceWrapper, Unimplemented, MiddlewareFunc (+4 more)

### Community 3 - "**/gen/**"
Cohesion: 0.12
Nodes (9): AuthPaths, GatewayPaths, PlatformPaths, RbacPaths, RealtimePaths, TemplatePaths, UsersPaths, WorkerPaths (+1 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, @phosphor-icons/react, react, react-dom, @starter/contracts, @starter/ui, @tanstack/react-query, devDependencies (+39 more)

### Community 5 - "index.tsx"
Cohesion: 0.07
Nodes (36): el, qc, el, qc, deleteMock, getMock, HealthState, Probe() (+28 more)

### Community 6 - "devDependencies"
Cohesion: 0.04
Nodes (47): dependencies, react, react-dom, @starter/contracts, @starter/ui, devDependencies, jsdom, msw (+39 more)

### Community 7 - "auth-ui.tsx"
Cohesion: 0.10
Nodes (41): api, apiError(), AuthApiError, forgot(), login(), LoginResult, readMessage(), register() (+33 more)

### Community 8 - "auth service (base mesh)"
Cohesion: 0.10
Nodes (37): auth service (base mesh), gateway service (base mesh), postgres service (base mesh), rbac service (base mesh), realtime service (base mesh), redis service (base mesh), users service (base mesh), web (shell) service (base mesh) (+29 more)

### Community 9 - "ui/package.json"
Cohesion: 0.06
Nodes (36): description, devDependencies, jsdom, react, react-dom, @testing-library/react, @types/react, @types/react-dom (+28 more)

### Community 10 - "index.ts"
Cohesion: 0.09
Nodes (31): api, AuthPage, FEATURES, PAGE, Window, AuthContext, AuthProvider(), SessionUser (+23 more)

### Community 11 - "Route"
Cohesion: 0.20
Nodes (8): Route, Upstreams, Config, TestSpecRouteTableSupportsHeadAndDeprecation(), Matcher, NewMatcher(), ParseUpstreams(), SpecRouteTable()

### Community 12 - "resilientTransport"
Cohesion: 0.15
Nodes (14): context.CancelFunc, github.com/getkin/kin-openapi/routers.Router, io.ReadCloser, net/http.Response, sync/atomic.Uint64, cachedResponse, cancelBody, endpointState (+6 more)

### Community 13 - "UsersPage.tsx"
Cohesion: 0.08
Nodes (36): ActivityFeed(), ActivityItem, ColumnKey, columnLabel(), copyText(), csvCell(), dateBoundary(), DEFAULT_COLUMNS (+28 more)

### Community 14 - "formatter"
Cohesion: 0.20
Nodes (10): enabled, indentStyle, indentWidth, lineWidth, semicolons, javascript, formatter, globals (+2 more)

### Community 15 - "middleware.go"
Cohesion: 0.16
Nodes (15): chi.Context, chiRouteContext(), CorrelationID(), LoggerFromContext(), newRequestID(), Observe(), RequestIDFromContext(), RequestLogger() (+7 more)

### Community 16 - "DECISIONS.md"
Cohesion: 0.09
Nodes (16): ADR-0002: Integer identities, Consequences, Context, Decision, ADR-0004: Consolidated migration baseline, Consequences, Context, Decision (+8 more)

### Community 17 - "auth service API (OpenAPI doc)"
Cohesion: 0.11
Nodes (30): _template codegen config (gen package), _template service API (OpenAPI doc), EnvelopeFail schema (template), EnvelopeMeta schema (template), EnvelopeOK schema (template), ping operation (template), auth codegen config (gen package), adminSetUserPassword operation (+22 more)

### Community 18 - "ErrBadRequest"
Cohesion: 0.10
Nodes (24): BulkPermissionResult, Loggerish, ErrBadRequest(), ErrConflict(), Role, RoleInput, userRole, Publisher (+16 more)

### Community 19 - "log/slog.Logger"
Cohesion: 0.12
Nodes (15): log/slog.Logger, sync.RWMutex, Hub, Client, prometheusGauge, contains(), Handlers, NewHandlers() (+7 more)

### Community 20 - "_template/gen/gen.go"
Cohesion: 0.11
Nodes (16): chi.Router, ChiServerOptions, EnvelopeOK, InvalidParamFormatError, MiddlewareFunc, RequiredHeaderError, RequiredParamError, ServerInterface (+8 more)

### Community 21 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 22 - "auth/gen/gen.go"
Cohesion: 0.07
Nodes (28): AdminSetUserPasswordJSONBody, AdminSetUserPasswordJSONRequestBody, AdminSetUserStateJSONBody, AdminSetUserStateJSONBodyStatus, AdminSetUserStateJSONRequestBody, ChangePasswordJSONBody, ChangePasswordJSONRequestBody, ConfirmPasswordJSONBody (+20 more)

### Community 23 - "scripts"
Cohesion: 0.06
Nodes (35): @axe-core/playwright, @biomejs/biome, js-yaml, devDependencies, @axe-core/playwright, @biomejs/biome, js-yaml, @playwright/test (+27 more)

### Community 24 - "rbac/gen/gen.go"
Cohesion: 0.08
Nodes (26): BulkCreatePermissionsJSONBody, BulkCreatePermissionsJSONRequestBody, CreatePermissionJSONBody, CreatePermissionJSONRequestBody, RoleInput, SetUserRolesJSONBody, SetUserRolesJSONRequestBody, UpdateRoleJSONBody (+18 more)

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
Cohesion: 0.06
Nodes (31): net/http.Client, net/smtp.Auth, Consumer, HTTPWebhookProvider, BuildMIME(), Mail, Mailer, NewMailer() (+23 more)

### Community 31 - "ARCHITECTURE overview"
Cohesion: 0.12
Nodes (17): Schema-per-Service Decision, ARCHITECTURE overview, Fail-Closed Route Registry, Gateway Topology, JWT Verified Once At Edge, Observability Flow, Redis Streams Event Backbone, Schema-per-Service Data Ownership (+9 more)

### Community 32 - "dev-all.sh"
Cohesion: 0.15
Nodes (22): ACCESS_TOKEN_SECRET, ADMIN_BOOTSTRAP_PASSWORD, APP_PUBLIC_URL, cleanup(), compose_infra(), DATABASE_URL, die(), docker_publishes() (+14 more)

### Community 33 - "check-coverage.mjs"
Cohesion: 0.11
Nodes (16): badgeDir, byPackage, changed, changedLines, changedRows, changedScore, listed, merged (+8 more)

### Community 34 - "On-call alert runbook"
Cohesion: 0.12
Nodes (16): AuthLoginFailureRate, AuthSessionErrors, CertificateExpiresSoon, FrontendErrorBurst, HostDiskSpaceLow, MailQueueBacklog, On-call alert runbook, PlatformErrorRateAnomaly (+8 more)

### Community 35 - "PublishWithAuditOutbox"
Cohesion: 0.09
Nodes (13): main(), Migrate(), migrationURL(), TestMigrationURLUsesServiceHistory(), redis.Client, PublishWithAuditOutbox(), MigrateUp(), migrateUp() (+5 more)

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

### Community 40 - "System diagrams"
Cohesion: 0.25
Nodes (8): Login and authorization, Refresh-token rotation and reuse detection, Registration and projection materialization, Session lifecycle, Stream data flow, System diagrams, Trust boundaries, Worker processing and realtime delivery

### Community 41 - "go-platform-starter README Overview"
Cohesion: 0.19
Nodes (16): User Taste Profile, CI: commitlint job, CI: go job (lint/build/test/contracts), CI: playwright smoke job, CI: security (Trivy + Semgrep) job, CI: web job (lint/test/build/budget), CI Workflow, release-please job (+8 more)

### Community 42 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @phosphor-icons/react, react, react-dom, react-router-dom, @starter/contracts, @starter/ui, @tanstack/react-query (+7 more)

### Community 43 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, jsdom, msw, @originjs/vite-plugin-federation, tailwindcss, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 45 - "Engineering guide"
Cohesion: 0.20
Nodes (9): v6 Definition of Done, DoD Wave Gates (0-7), Definition of done by work type, Engineering guide, Git workflow, Go standards, Naming, Review guide (+1 more)

### Community 46 - "BACKLOG (1.202 improvement items)"
Cohesion: 0.09
Nodes (26): ADR-0001: Fresh-build Pivot, GORM Replaces sqlc/pgx-direct, Ops Files Per Component, BACKLOG (1.202 improvement items), Backlog: Architecture & Scalability, Backlog: CI/CD & Release, Backlog: Data & Migrations, Backlog: Docs & Governance (+18 more)

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
Cohesion: 0.18
Nodes (13): go.opentelemetry.io/otel/sdk/resource.Resource, TestTraceAndBaggageMapRoundTrip(), ExtractTraceMap(), InitTracer(), InjectTraceMap(), newResource(), TraceIDFromContext(), traceSampleRatio() (+5 more)

### Community 52 - "RolesPage.tsx"
Cohesion: 0.05
Nodes (34): api, PermissionInfo, Role, AuditEntry, download(), exportMatrixPng(), iconGlyphs, iconNames (+26 more)

### Community 53 - "/graphify Skill Command"
Cohesion: 0.20
Nodes (11): Graphify Skill-Trigger Directive, Add & Watch Reference Doc, Exports & Benchmark Reference Doc, Extraction Subagent Prompt Spec, GitHub Clone & Cross-Repo Merge Reference Doc, Commit Hook & CLAUDE.md Integration Reference Doc, Query/Path/Explain Reference Doc, Transcribe Video/Audio Reference Doc (+3 more)

### Community 54 - "DashboardShell.tsx"
Cohesion: 0.05
Nodes (41): DeleteRoleModal(), Root(), applyTheme(), useGatewayHealth(), useTheme(), OfflineBanner(), SessionExpiringBanner(), CommandPalette() (+33 more)

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
Cohesion: 0.08
Nodes (31): AuthRoutes(), ForbiddenPage(), ForgotPage, Gate(), handleLoggedIn(), handleReauthenticated(), LoginPage, LoginResult (+23 more)

### Community 63 - "password.go"
Cohesion: 0.22
Nodes (11): totpCode(), verifyTOTP(), CalibrateBcryptCost(), checkHIBP(), passwordHistoryContains(), passwordNeedsRehash(), sha1Hex(), validatePasswordComplexity() (+3 more)

### Community 64 - "Handlers"
Cohesion: 0.16
Nodes (8): ListOK(), SetPaginationLinks(), listData, Meta, ListRoleUsersParams, Handlers, Service, NewHandlers()

### Community 65 - "main.tsx"
Cohesion: 0.21
Nodes (8): App(), observeWebVitals(), rating(), report(), VitalName, el, worker, handlers

### Community 66 - "auth"
Cohesion: 0.10
Nodes (20): adminListUserSessions, adminRevokeUserSession, adminRevokeUserSessions, adminSetUserPassword, adminSetUserState, auth, beginMFA, changePassword (+12 more)

### Community 67 - "main"
Cohesion: 0.12
Nodes (19): withBaseLogger(), redis.Client, NewRedisClient(), WaitForRedis(), chi.Router, NewRouter(), GracefulRun(), shutdownTimeout() (+11 more)

### Community 68 - "e2e_test.go"
Cohesion: 0.31
Nodes (12): envelope, proc, os/exec.Cmd, buildBinaries(), call(), flattenEnv(), freePort(), login() (+4 more)

### Community 69 - "CONTRIBUTING.md"
Cohesion: 0.08
Nodes (19): Contributor Covenant Code of Conduct, Expected behavior, Our pledge, Scope and enforcement, Change workflow, Contributing, Pull requests, Required local checks (+11 more)

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
Cohesion: 0.11
Nodes (18): resolveGatewayURL(), adminSetUserPasswordSchema, adminSetUserStateSchema, bulkCreatePermissionsSchema, changePasswordSchema, confirmPasswordSchema, createPermissionSchema, createRoleSchema (+10 more)

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
Cohesion: 0.31
Nodes (9): jobConfig, closeDB(), envFile(), redis.Client, main(), parseJobs(), pingDB(), runJobs() (+1 more)

### Community 85 - "newUsersFixture"
Cohesion: 0.24
Nodes (10): profileOption, userAuditPublisher, Profile, redis.Client, Service, newUsersFixture(), profileBuilder(), TestGoldenUsersFixture() (+2 more)

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
Cohesion: 0.09
Nodes (23): Permission, Role, Session, encoding/json.RawMessage, testing.B, time.Time, auditRow, ListCursor (+15 more)

### Community 91 - "gorm.io/gorm.DB"
Cohesion: 0.13
Nodes (28): gorm.io/gorm.DB, net/http.HandlerFunc, ParsePagination(), recordingMailer, PurgeDeletedProfiles(), RefreshReadModels(), FlushAuditOutbox(), closeDB() (+20 more)

### Community 94 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 95 - "generate-contract-modules.mjs"
Cohesion: 0.17
Nodes (10): generatedFiles, methods, pathsByTag, resolve(), root, schemasOutput, source, spec (+2 more)

### Community 96 - "main"
Cohesion: 0.25
Nodes (7): SweepSessions(), RegisterSessionMetrics(), lowerEnv(), main(), pingDB(), seedAdmin(), sqlClose()

### Community 97 - "Recoverer"
Cohesion: 0.21
Nodes (9): frontendError, InitErrorReporter(), ReportError(), toError(), Recoverer(), ErrorReporter, noopReporter, FrontendErrors() (+1 more)

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
Cohesion: 0.18
Nodes (19): consumerQuotaPolicy, ctxKeyAuth, net/netip.Prefix, redis_rate.Limiter, clientIP(), corsHandler(), edgeRateLimit(), envFile() (+11 more)

### Community 108 - "auth/internal/jwt.go"
Cohesion: 0.27
Nodes (12): Claims, jwt.RegisteredClaims, mint(), MintAccess(), MintAccessWithRing(), MintReset(), MintResetWithRing(), mintWithRing() (+4 more)

### Community 111 - "Reliability & Resilience"
Cohesion: 0.14
Nodes (12): Backup, Backup and restore, Disaster recovery, Policy, Restore rehearsal, Backup and disaster recovery, Deliberate non-mechanisms, Deployment safety (+4 more)

### Community 114 - "GormLogger"
Cohesion: 0.28
Nodes (3): queryOperation(), slowQuerySampled(), GormLogger

### Community 142 - "testing.T"
Cohesion: 0.10
Nodes (27): testing.T, discardLogger(), TestEnvelopeGoldenFile(), TestFailEnvelopeShape(), TestGormLoggerTrace(), TestListOKShape(), TestOKEnvelopeShape(), TestPaginationLinks() (+19 more)

### Community 150 - "check-migrations.mjs"
Cohesion: 0.29
Nodes (12): [command = "check", argument], digest(), fail(), files, lint(), manifestPath, migrationFiles(), pathOf() (+4 more)

### Community 153 - "DoD Evidence Checklist"
Cohesion: 0.13
Nodes (15): Deliberately Avoided Versioning Practices, Web Micro-frontend Federation, Backlog: Developer Experience, Spec-to-Typed-Client Pipeline, DoD Evidence Checklist, Onboarding Guide, Dev/Lab/UAT/Demo/Prod Environments, Local Gate Pipeline (mirrors CI) (+7 more)

### Community 154 - "ScalarHandlers"
Cohesion: 0.40
Nodes (3): AggregateDocs(), ScalarHandlers(), TestScalarPageHasExecutableCSPAndSRI()

### Community 155 - "Publish"
Cohesion: 0.18
Nodes (14): MFAEnrollment, DecryptForSubject(), DeriveKey(), EncryptForSubject(), KeyedDigest(), VerifyDigest(), TestSecurityPrimitives(), TestStreamMessageSigningAndEncryption() (+6 more)

### Community 156 - "StartRedis"
Cohesion: 0.12
Nodes (15): io/fs.FS, TestDistributedLockOwnershipAndRenewal(), TestLeaderElectionAllowsOneActiveLeader(), TestSchedulerSingleRunnerAndPanicSafety(), dockerAvailable(), requireDocker(), StartPostgres(), StartRedis() (+7 more)

### Community 157 - "Service"
Cohesion: 0.13
Nodes (16): testing.F, ErrNotFound(), RegistrationDay, UserStats, FuzzHandlerDecode(), FuzzUserOrderClauseNeverIncludesInput(), FuzzValidateProfileFields(), TestProfileSecurityValidation() (+8 more)

### Community 159 - "Data and migration operations"
Cohesion: 0.18
Nodes (10): Backfills and seeds, Backup, PITR, masking, and recovery, Data and migration operations, Growth, archive, and purge, Index, integrity, and vacuum operations, Query review and budgets, Required migration workflow, Rollback playbook (+2 more)

### Community 162 - "serveIdempotent"
Cohesion: 0.29
Nodes (8): net/http.Header, bufferedWriter, idempotencyRecord, InjectTraceHeaders(), copyHeader(), redis.Client, requestFingerprint(), serveIdempotent()

### Community 164 - "Testing & QA"
Cohesion: 0.25
Nodes (7): Commands, Conditional tools, Coverage policy, Mutation testing spike, Requirement evidence, Test naming and data, Testing & QA

### Community 165 - "ClaimsClient"
Cohesion: 0.27
Nodes (6): container/list.Element, container/list.List, cachedClaims, claimEntry, ClaimsClient, NewClaimsClient()

### Community 166 - "users/gen/gen.go"
Cohesion: 0.07
Nodes (28): ListUsersParamsCount, ListUsersParamsInclude, ListUsersParamsLimit, ListUsersParamsOrder, ListUsersParamsPresence, ListUsersParamsSort, MeParamsInclude, ResizeAvatarMultipartBody (+20 more)

### Community 167 - "Handlers"
Cohesion: 0.09
Nodes (15): ctxKeyEmail, ctxKeyPerms, AuthorizeResource(), ErrForbidden(), ErrUnauthorized(), SecretMatch(), RequireSessionIdentity(), withAuthScope() (+7 more)

### Community 170 - "RemoteErrorBoundary.tsx"
Cohesion: 0.22
Nodes (5): CopyErrorButton(), Props, RemoteErrorBoundary, State, useCopy()

### Community 174 - "RUNBOOK.md"
Cohesion: 0.11
Nodes (15): Afterward, Incident response playbook, Response, Roles, Severity, Common operations, Escalation and handoff, Operational runbook (+7 more)

### Community 175 - "api-changelog.mjs"
Cohesion: 0.17
Nodes (10): added, after, before, changed, current, methods, previous, removed (+2 more)

### Community 176 - "newResilientTransport"
Cohesion: 0.24
Nodes (8): net/http.Transport, TestIdempotencyReplaysSuccessfulResponse(), TestProxyUsesValidatedClientIP(), TestResilientTransportFailsOverGET(), TestResilientTransportHedgesSlowGET(), TestResilientTransportServesFreshCachedResponsePerConsumer(), newResilientTransport(), TestUpstreamTransportInjectsChildTraceContext()

### Community 177 - "Contracts Pipeline (spec-first)"
Cohesion: 0.28
Nodes (9): Spec-First Without a Behavioral Contract, API Versioning Policy, Deprecation Mechanics (RFC-9745), /api/v1 Frozen Contract, Adding v2 API Strategy, Backlog: API & Contracts, Contracts Pipeline (spec-first), OpenAPI Spec as Source of Truth (+1 more)

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
Nodes (10): ctxKeyHash, forgotInput, loginInput, registerInput, resetInput, clientIP(), ctxKeySub, subFromContext() (+2 more)

### Community 186 - "openapi-fuzz.mjs"
Cohesion: 0.40
Nodes (4): base, crashes, payloads, spec

### Community 187 - "TestDatabaseTimeoutsPreserveDSN"
Cohesion: 0.40
Nodes (3): FeatureEnabled(), TestDatabaseTimeoutsPreserveDSN(), TestFeatureEnabled()

### Community 188 - "NewLogger"
Cohesion: 0.11
Nodes (19): log/slog.Attr, log/slog.Handler, log/slog.Level, log/slog.LevelVar, log/slog.Record, levelName(), maskPII(), NewLogger() (+11 more)

### Community 189 - "ProxyHandler"
Cohesion: 0.29
Nodes (8): ProxyDeps, serviceStatus, clearIdentity(), redis.Client, LoadSpecs(), primaryEndpoint(), ProxyHandler(), StatusPage()

### Community 193 - "time.Duration"
Cohesion: 0.16
Nodes (11): time.Duration, redis.Client, NewLeaderElector(), redis.Client, TryDistributedLock(), readSlowRequestThreshold(), SetSlowRequestThreshold(), DistributedLock (+3 more)

### Community 196 - "resilience-drill.sh"
Cohesion: 0.33
Nodes (5): DRILL_DSN, DRILL_REDIS, E2E_ADMIN_PASSWORD, resilience-drill.sh script, start_auth()

### Community 197 - "Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: Implement all Engineering items I1-I80 in the Testing & QA category of docs/BACKLOG.md

### Community 198 - "permissions.go"
Cohesion: 0.67
Nodes (3): All(), IsValid(), MustValid()

### Community 200 - "newRBACFixture"
Cohesion: 0.25
Nodes (9): qaLogger, RoleInput, MigrateUp(), Service, newRBACFixture(), roleBuilder(), TestAssignDefaultRoleIsIdempotent(), TestPermissionAndRoleAssignmentIntegration() (+1 more)

### Community 201 - "Audit"
Cohesion: 0.17
Nodes (10): sync.Mutex, Audit(), Loggerish, AuditEvent, StreamPublisher, TestUserLifecycleTransitions(), ValidateUserTransition(), qaPublisher (+2 more)

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

### Community 217 - "NewGormLogger"
Cohesion: 0.50
Nodes (4): gorm.io/gorm/logger.Interface, gorm.io/gorm/logger.LogLevel, NewGormLogger(), newSilentGormLogger()

### Community 218 - "pull_request_template.md"
Cohesion: 0.40
Nodes (4): Change, Impact and delivery, Release notes draft, SQL / migration review

### Community 219 - "Profile"
Cohesion: 0.33
Nodes (4): Profile, RoleSummary, Config, RoleSummary

### Community 220 - "Fail"
Cohesion: 0.50
Nodes (4): Fail(), WriteJSON(), failEnvelope, okEnvelope

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

### Community 235 - "main"
Cohesion: 0.17
Nodes (13): LoadDotEnv(), loadSecretFiles(), MustParseEnv(), TestLoadDotEnv(), TestSecretFileEnvAdapterIgnoresOptionalAppEnvFile(), envGet(), writeFile(), Service (+5 more)

### Community 236 - "health.go"
Cohesion: 0.39
Nodes (7): buildValue(), Drain(), Healthz(), Readyz(), Version(), TestHealthDetailAndVersion(), Checker

### Community 237 - "linter"
Cohesion: 0.33
Nodes (6): linter, enabled, rules, recommended, style, useNodejsImportProtocol

### Community 238 - "auth/internal/service.go"
Cohesion: 0.18
Nodes (11): github.com/lib/pq.StringArray, passwordRecord, ErrInternal(), AppError, TokenIntrospection, ErrConflictEmail(), Config, Publisher (+3 more)

### Community 240 - "Observability"
Cohesion: 0.22
Nodes (9): Deploy annotations, Observability, Postgres and Redis, Profiling, Run the stack, Sampling and focused debug, SLO and error budget policy, Synthetic and external uptime (+1 more)

### Community 242 - "index.md"
Cohesion: 0.09
Nodes (18): API contract standards, Platform and event surface, Requests and collections, Responses, caching, and compatibility, Build and operate, go-platform-starter documentation, Govern, Start (+10 more)

### Community 243 - "Q: Implement all Engineering items in the API & Contracts backlog"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in the API & Contracts backlog, Source Nodes

### Community 244 - "Troubleshooting"
Cohesion: 0.12
Nodes (11): Bundle audit, Performance engineering evidence, Published ports, Authentication loops or refresh fails, Database or Redis is slow, Gateway rejects a route or refuses to boot, Generated files are stale, Hard refresh returns 404 or loses the session (+3 more)

### Community 247 - "ConsumeUserEvents"
Cohesion: 0.29
Nodes (6): UserCreatedEvent, ScheduledEvent, UserDeletedEvent, AssignDefaultRole(), ConsumeUserEvents(), redis.Client

### Community 248 - "check-docs.mjs"
Cohesion: 0.29
Nodes (5): failures, ignored, readme, required, root

### Community 250 - "[Unreleased]"
Cohesion: 0.40
Nodes (4): Added, Changed, Changelog, [Unreleased]

### Community 252 - "Q: Implement all Engineering items in Docs & Governance plus decisions N8, N29, and N49"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Implement all Engineering items in Docs & Governance plus decisions N8, N29, and N49, Source Nodes

### Community 253 - "record-quickstart.mjs"
Cohesion: 0.40
Nodes (4): destination, directory, root, video

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
Cohesion: 0.29
Nodes (6): net/url.URL, TestDynamicRoutingConfiguration(), TestMiddlewareRegistryHonorsConfiguredOrder(), TestSpecRouteExtensions(), ParseConsumerQuotas(), ParseWebSocketRoutes()

## Knowledge Gaps
- **988 isolated node(s):** `Change`, `Release notes draft`, `Impact and delivery`, `SQL / migration review`, `Added` (+983 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **64 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Deprecation()` connect `Contracts Pipeline (spec-first)` to `net/http.Request`, `Publish`, `ProxyHandler`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `SecurityHeaders()` connect `Security Posture` to `Publish`, `users/gen/gen.go`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `Change`, `Release notes draft`, `Impact and delivery` to the rest of the system?**
  _988 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `net/http.Request` be split into smaller, more focused modules?**
  _Cohesion score 0.062173458725182866 - nodes in this community are weakly interconnected._
- **Should `**/gen/**` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07315233785822021 - nodes in this community are weakly interconnected._