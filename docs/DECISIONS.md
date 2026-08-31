# Decision log

This index summarizes accepted product and engineering decisions. ADRs remain
the authoritative record for architecture; operational policies link their
own source documents.

| Date | Decision | Status | Source |
| --- | --- | --- | --- |
| 2026-08-24 | Fresh-build Go microservices plus React federation | accepted | [ADR-0001](adr/0001-fresh-build-pivot.md) |
| 2026-08-25 | Integer persistence identities | accepted | [ADR-0002](adr/0002-integer-identities.md) |
| 2026-08-25 | Users schema owns profile projection | accepted | [ADR-0003](adr/0003-users-table-ownership.md) |
| 2026-08-25 | Consolidated first-release migration baseline | accepted | [ADR-0004](adr/0004-consolidated-migration-baseline.md) |
| 2026-08-31 | Documentation portal uses MkDocs core and its built-in theme | accepted | [Documentation versioning](VERSIONING.md) |
| 2026-08-31 | Contributor Covenant governs community behavior | accepted | [Code of Conduct](https://github.com/kochan4php/go-platform-starter/blob/main/CODE_OF_CONDUCT.md) |
| 2026-08-31 | Pair/mob work is opt-in with explicit roles | accepted | [Collaboration guide](COLLABORATION.md) |
| 2026-08-31 | CI/CD uses protected promotion, Kustomize, and hosted runners by default | accepted | [CI/CD controls](CI_CD.md) |
| 2026-08-31 | Repository remains a path-gated monorepo | accepted | [ADR-0005](adr/0005-monorepo-delivery.md) |
| 2026-08-31 | Container auto-update is rejected; signed promotion gates remain mandatory | accepted | [Infra and operations](INFRA_OPS.md#backup-secrets-and-immutable-releases) |
| 2026-08-31 | GitHub Pages hosts the public status snapshot outside the production VPS | accepted | [Infra and operations](INFRA_OPS.md#availability-residency-and-communication) |
| 2026-08-31 | Air-gapped on-premises export is a supported deployment variant | accepted | [Infra and operations](INFRA_OPS.md#portability-and-air-gapped-operation) |
| 2026-08-31 | Frontend uses native controlled forms, typed native-Intl i18n, and CSS motion | accepted | [Frontend engineering](FRONTEND_ENGINEERING.md#language-design-and-motion-decisions) |
| 2026-08-31 | Minimal PWA and runtime flags are accepted; Web Push and A/B testing are deferred behind explicit product and privacy gates | accepted | [Frontend engineering](FRONTEND_ENGINEERING.md#pwa-privacy-and-experiments) |
| 2026-08-31 | Biome is the sole frontend linter; ESLint/React Compiler lint packages are prohibited by supply-chain policy | accepted | [Frontend engineering](FRONTEND_ENGINEERING.md#shared-component-and-hook-inventory) |

Open product decisions remain visible and unchecked in `docs/BACKLOG.md`; they
are not silently converted into implementation policy.
