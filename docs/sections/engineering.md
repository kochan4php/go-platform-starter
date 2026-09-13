---
title: Engineering
nav_order: 5
has_children: true
---

# Engineering

What a change has to carry before it is done, and the gates that check it.

| Page | Read it when |
| --- | --- |
| [Engineering guide](../ENGINEERING_GUIDE.md) | You want the table of required evidence per kind of work. Start here. |
| [Definition of done](../DOD.md) | You are about to open a pull request and want the checklist. |
| [Developer experience](../DEVELOPER_EXPERIENCE.md) | You are changing the local tooling, which is treated as a product surface. |
| [CI/CD and release controls](../CI_CD.md) | A gate failed and you need to know which lane owns it. |
| [Testing](../TESTING.md) | You are choosing a test layer — the repository uses the smallest one that proves the boundary. |
| [Frontend engineering](../FRONTEND_ENGINEERING.md) | You are working in `apps/*` or `packages/*`. |
| [Performance](../PERFORMANCE.md) | You are measuring, not guessing. |
| [Bundle report](../performance/BUNDLE_REPORT.md) | You need the measured production bundle breakdown. |
| [Load testing](../performance/K6.md) | You want to run k6 against the local mesh. |
| [Reliability](../RELIABILITY.md) | You need the operating contract behind the reliability work. |
| [Product roadmap](../PRODUCT_ROADMAP.md) | You want to know what the product slices are meant to become. |
| [Learning](../LEARNING.md) | You want the reading list, which prefers primary documentation. |

## The gate that matters most

`make dev-test` is the canonical pre-push check: Go tests and vet, plus the
pnpm lint, test, contracts, and developer-experience suites.

Go tests that need PostgreSQL or Redis use testcontainers and **skip silently
when Docker is down**. A green `go test` without Docker running proves much less
than CI does.
