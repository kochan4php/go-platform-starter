# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Release Please owns
future version sections from Conventional Commits.

## 1.0.0 (2026-09-02)


### ⚠ BREAKING CHANGES

* **schema:** integer auto-increment identity across all tables + UX fixes
* **api:** redesign endpoints under /api/v1, add roles CRUD and users/me
* replace prisma with sequelize-typescript, rebuild RBAC without gate, harden auth

### Features

* add .gitattributes for graphify merge strategy on graph.json ([49eff1b](https://github.com/kochan4php/go-platform-starter/commit/49eff1b04e966f1e4bc0ee20bcddbcada63370bb))
* add session menu, shortcuts help, and topbar components ([92d11f2](https://github.com/kochan4php/go-platform-starter/commit/92d11f2cce638486157325619e96c61012dece6b))
* **api:** redesign endpoints under /api/v1, add roles CRUD and users/me ([1906480](https://github.com/kochan4php/go-platform-starter/commit/190648064abd0de5a3bd0ccef144a58df071648f))
* **auth-ui:** complete engineering backlog ([b4d2a8b](https://github.com/kochan4php/go-platform-starter/commit/b4d2a8b56b9d6cdaa9e291d1f3e115d91cad95e4))
* complete API and contracts engineering ([1e1aeb9](https://github.com/kochan4php/go-platform-starter/commit/1e1aeb9cd58d9fc2d74ba72732ea74b671c6815a))
* complete architecture and scalability engineering ([048a54b](https://github.com/kochan4php/go-platform-starter/commit/048a54bcfd10f4c242743c3bfd34ab51e532ae8c))
* complete CI/CD and release engineering ([0d090e6](https://github.com/kochan4php/go-platform-starter/commit/0d090e65e8e509a4efa3f8ee7a6563f62a63df90))
* complete data and migrations engineering ([80537ae](https://github.com/kochan4php/go-platform-starter/commit/80537ae0a487601cf74deb06ada1ca9e218a8bad))
* complete frontend engineering backlog ([5b52d70](https://github.com/kochan4php/go-platform-starter/commit/5b52d705ca20df8d6a2ac18ccc8e9ad6e91afe13))
* complete infrastructure and operations engineering ([92ab3e8](https://github.com/kochan4php/go-platform-starter/commit/92ab3e8204442143a806ca8fde454e69ec3cd747))
* deliver product roadmap capabilities ([f663143](https://github.com/kochan4php/go-platform-starter/commit/f663143d8b599d10f619dda300a85607e317626f))
* **dx:** complete developer experience backlog ([7a15727](https://github.com/kochan4php/go-platform-starter/commit/7a157277de6b4bb86edaf2a3d6251d998e24674d))
* **env:** lab/uat/demo environment matrix, dev-all orchestrator, English docs ([939c596](https://github.com/kochan4php/go-platform-starter/commit/939c596418cda1275938f5d873dd3d97416c729d))
* migrate to vitest, refactor db health check, update scalar docs ([d739940](https://github.com/kochan4php/go-platform-starter/commit/d739940ad6f872a306c0235523d4fb4a1070de87))
* **observability:** complete engineering backlog ([9e53cce](https://github.com/kochan4php/go-platform-starter/commit/9e53ccef388b0cea13f7d802a1f8130644c4a1c1))
* **performance:** complete engineering backlog ([bf4b3e6](https://github.com/kochan4php/go-platform-starter/commit/bf4b3e6c3e4c48365aae5c28bcff1eac57a89f14))
* **prod:** production-ready deploy — compose.prod, edge nginx, VPS deploy script, README overhaul ([a4adc7c](https://github.com/kochan4php/go-platform-starter/commit/a4adc7c0cea6c310083b7e869fe2f0be51378e64))
* **rbac:** complete roles and permissions management ([41c4fb5](https://github.com/kochan4php/go-platform-starter/commit/41c4fb5e8929f773a344b677e74c5b2c122f6d04))
* Refactor authorization system to use permissions and roles ([ab60edf](https://github.com/kochan4php/go-platform-starter/commit/ab60edff40a6ee5348f8c96f7d45287f4659caea))
* **reliability:** complete engineering backlog ([1849e6c](https://github.com/kochan4php/go-platform-starter/commit/1849e6c70ea5983ed7a0fe8c056404a17d76c211))
* replace prisma with sequelize-typescript, rebuild RBAC without gate, harden auth ([27d797c](https://github.com/kochan4php/go-platform-starter/commit/27d797cb68d818f9d310a9d67104ea683d83cb15))
* **schema:** integer auto-increment identity across all tables + UX fixes ([f28a17c](https://github.com/kochan4php/go-platform-starter/commit/f28a17c20ddb984f3e1c893b45c8962a0833e8fc))
* **security:** harden authentication and platform ([d81fc24](https://github.com/kochan4php/go-platform-starter/commit/d81fc24c559347b44da998f3f8bca62c51946c38))
* **security:** implement Laravel-style Gate authorization and security tooling ([316c17c](https://github.com/kochan4php/go-platform-starter/commit/316c17c9b2817a606aaf69c45bd28d0773ea69be))
* **ui:** redesign console as an elegant dark dashboard (Cabinet Grotesk, GSAP, bento) ([ec12594](https://github.com/kochan4php/go-platform-starter/commit/ec125942a914c14927dd70a8deb9944927a2e06f))
* **ui:** responsive dashboard shell + register-user flow + polish ([73f0b3f](https://github.com/kochan4php/go-platform-starter/commit/73f0b3f8eee5c75075b0e7bf54b3360633945811))
* **users:** login telemetry + online presence + full register modal + role assignment ([2337a2d](https://github.com/kochan4php/go-platform-starter/commit/2337a2d92e79a9150b957d6d26f0219fb31d67d6))
* **v3:** phase 1 — fail-fast typed environment ([5c6d076](https://github.com/kochan4php/go-platform-starter/commit/5c6d076fbf3b00c842a18e3efbe727dd35bd27c8))
* **v3:** phase 4 — auth completion (lockout, mailer, password reset, bootstrap admin) ([72dfccb](https://github.com/kochan4php/go-platform-starter/commit/72dfccb5b5e8148d14e1d441b0c352da6cb8acec))
* **v3:** phase 5 — list ergonomics ({items, meta} envelope) ([b2ba5a5](https://github.com/kochan4php/go-platform-starter/commit/b2ba5a5f12851b0fe8a94ec0a71c2cfb0de9965e))
* **v3:** phase 6 — realtime module with typed events and handshake auth ([a285baa](https://github.com/kochan4php/go-platform-starter/commit/a285baae8789b9a7024004ed884ad8def7e1310e))
* **v3:** phases 2+3 — pino structured logging + zod-generated OpenAPI ([2283b3c](https://github.com/kochan4php/go-platform-starter/commit/2283b3c9c3b7d990dd6109b7ce9d02c787019c71))
* **v5:** wave 0 — monorepo restructure, Go platform package, parity fixtures ([d8dbb82](https://github.com/kochan4php/go-platform-starter/commit/d8dbb82ec82029e0ba8e1a7ab079a11e2006f7af))
* **v5:** wave 0 rev — chi v5 as service router, repo renamed go-platform-starter ([34edcd4](https://github.com/kochan4php/go-platform-starter/commit/34edcd4b41e5c5a4e89b4446727354cba2bf6745))
* **w0:** wave 0 — platform package, template service, scaffold + gate green ([d412fac](https://github.com/kochan4php/go-platform-starter/commit/d412facad8f81a4cbbf60b98df193b4f21fc997d))
* **w1:** auth service — register/login/refresh/reset/sessions + gate green ([7918bf8](https://github.com/kochan4php/go-platform-starter/commit/7918bf85c29c012e09831fbfd805df3f5009220d))
* **w2:** users + rbac + gateway — MVP mesh e2e green ([819e2c1](https://github.com/kochan4php/go-platform-starter/commit/819e2c15f50056d91e93cbe810b9ff6a47b0463a))
* **w3:** realtime ws service — rooms, presence, force-logout kick ([0f6884d](https://github.com/kochan4php/go-platform-starter/commit/0f6884d6163724c0dd5d31c27302c65af540715c))
* **w4:** worker service — streams consumer, DLQ, idempotent handlers, schedulers ([d420cce](https://github.com/kochan4php/go-platform-starter/commit/d420cce12a1a1d97c2999a335cb828f92467b52d))
* **w5:** web microfrontend shell — federated host + 3 remotes, typed contracts, playwright smoke green ([3a49ed5](https://github.com/kochan4php/go-platform-starter/commit/3a49ed57c2dc8f238073ea1b20e9da0345c510a8))
* **w6:** observability & ops — otel traces, obs compose, audit viewer, docs ([1ff50c2](https://github.com/kochan4php/go-platform-starter/commit/1ff50c27943909ac63326aa852973862a8351c6c))
* **w7:** hardening — drills, security pass, compose mesh, release automation, DoD signed ([95a880c](https://github.com/kochan4php/go-platform-starter/commit/95a880c9ae18fe1ae7da9ecf1802d2937b2873e8))


### Bug Fixes

* **app:** session-expired handling, permission creation UI, stable dev teardown ([c016298](https://github.com/kochan4php/go-platform-starter/commit/c016298d9d8c00150f49273ee2a17454fc6eb097))
* asynchronous server initialization to prevent port blocking on db startup ([3ef21f5](https://github.com/kochan4php/go-platform-starter/commit/3ef21f55a1e0f06b97ea5e991f5935c9567dfc3e))
* database connection race condition and retry logic ([4932751](https://github.com/kochan4php/go-platform-starter/commit/493275169c11bb7533bf93f68fe34fd929bf8222))
* define healthcheck startup periods ([2ddd384](https://github.com/kochan4php/go-platform-starter/commit/2ddd384364034b87e6ea1f4196910fdbbdea3986))
* **dev:** dedupe react/react-query across aliased remote sources ([b71170c](https://github.com/kochan4php/go-platform-starter/commit/b71170c3e3c4e7dd3c3f785d8bc275b33aab25e4))
* **dev:** down also stops the lab stack; clearer port-conflict message ([3bf4f1c](https://github.com/kochan4php/go-platform-starter/commit/3bf4f1c40c56b3cef17dfa6b81d5dd7ca75edac6))
* **dev:** gateway port wiring + dev federation via source aliases; unify UI identity ([bbc7caf](https://github.com/kochan4php/go-platform-starter/commit/bbc7caf336ef643d972bb707ee80f14b48a64ea3))
* **dev:** resolve service race conditions, pnpm path, and windows ipv6 docker networking errors ([ca81685](https://github.com/kochan4php/go-platform-starter/commit/ca816857a24244832a388187cd4463180110c931))
* **dev:** standardize loopback hosts ([bf89a86](https://github.com/kochan4php/go-platform-starter/commit/bf89a86325669c715deffc7d8ddebaaea8cb1255))
* harden multi-environment deployments ([ac8d5fc](https://github.com/kochan4php/go-platform-starter/commit/ac8d5fccefa294fd2369459b0da9bd8710a81e3a))
* **infra:** repair docker builds, de-secret compose/k8s, fix jenkins deploy+dast ([5f17913](https://github.com/kochan4php/go-platform-starter/commit/5f179139e5c73ef797eb66a39f8f2e61a87fc89d))
* make Vite startup deterministic ([ba3c1ef](https://github.com/kochan4php/go-platform-starter/commit/ba3c1efb9a74b101a610f26f04f688fbcc105463))
* **middleware:** resolve validate.middleware req.query assignment bug and refactor app bootstrap ([30f9642](https://github.com/kochan4php/go-platform-starter/commit/30f96421b7aa04168808abb387fccd213be2e094))
* **prod:** frontend-to-backend broken in production; stale migrate containers ([5dc908a](https://github.com/kochan4php/go-platform-starter/commit/5dc908a2ec3b1a75b91ffba76a112bc077a8c9ae))
* **rbac:** 409 with friendly message on duplicate role names; consolidated migrations; identity table moved to users schema ([5217356](https://github.com/kochan4php/go-platform-starter/commit/52173564ae1f5f3533de446522ca79931d64c5b0))
* resolve deploy drift URLs dynamically ([841d5e9](https://github.com/kochan4php/go-platform-starter/commit/841d5e9c8575eb5fba5b2ad42776a2941768879a))
* resolve TypeScript compatibility issues ([8ee4075](https://github.com/kochan4php/go-platform-starter/commit/8ee40753fd35404ba233e7f7196fd83a3e54b09d))
* **ui:** null-permission crash, route-change error reset, admin register flow ([fec3ef7](https://github.com/kochan4php/go-platform-starter/commit/fec3ef778bfbdb05369b9a804bf53ba6f26165b9))
* update generated timestamps and scores in graphify learning data ([d76b680](https://github.com/kochan4php/go-platform-starter/commit/d76b680063f24d9d3cb11c3a95479f99d9920d28))
* use resolvable Trivy action release ([c5201da](https://github.com/kochan4php/go-platform-starter/commit/c5201da3988e5d0e53b9ccab64c869f7bb6138c9))
* **v5:** drop -race from local go test script (cgo-free windows); race stays in CI + Makefile ([c1333a5](https://github.com/kochan4php/go-platform-starter/commit/c1333a5d4c06530ad7aa691c436ae6fee86a3993))

## [Unreleased]

### Added

- Complete production-shaped Go service, React micro-frontend, data migration,
  API contract, reliability, security, observability, performance, and testing
  foundations.
- Versioned documentation portal, governance policies, operational guides, and
  generated API/environment/port/license references.
- Reproducible developer tooling with generators, local service utilities,
  direct API docs, HTTPS, realistic seeds, editor/devcontainer configuration,
  and automated review gates.

### Changed

- Documentation changes are now checked for broken links and generated-reference
  drift in CI.

[Unreleased]: https://github.com/kochan4php/go-platform-starter/compare/v0.1.0...HEAD
