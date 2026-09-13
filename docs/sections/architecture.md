---
title: Architecture
nav_order: 3
has_children: true
---

# Architecture

How the services are divided, why the boundaries sit where they do, and which
decisions are settled.

| Page | Read it when |
| --- | --- |
| [Overview](../ARCHITECTURE.md) | You need the whole picture: Go services behind a Go gateway, React remotes, schema-per-service. |
| [Detailed diagrams](../DIAGRAMS.md) | The overview is not concrete enough and you want the request and event paths drawn. |
| [Scalability](../ARCHITECTURE_SCALABILITY.md) | You are handing the design to operations and need the implemented limits. |
| [Scaling operations](../SCALING.md) | You need reliability defaults, DR targets, DLQ replay, and chaos experiments. |
| [Query keys](../QUERY_KEYS.md) | You are adding a TanStack Query call and must match the hierarchical key shape. |

## Decisions

Architecture Decision Records hold the decisions that are expensive to reverse.
They record durable choices, not meeting notes — read the
[ADR index](../adr/README.md) before proposing a change that contradicts one,
and use the [ADR template](../templates/ADR.md) to write a new one.

- [ADR 0001 — Fresh-build pivot](../adr/0001-fresh-build-pivot.md)
- [ADR 0002 — Integer identities](../adr/0002-integer-identities.md)
- [ADR 0003 — Users table ownership](../adr/0003-users-table-ownership.md)
- [ADR 0004 — Migration baseline](../adr/0004-consolidated-migration-baseline.md)
- [ADR 0005 — Monorepo delivery](../adr/0005-monorepo-delivery.md)

## The rule that constrains everything else

Service code lives in `services/<name>/internal/...`, which the Go compiler
refuses to let another service import. Shared behaviour goes in
`internal/platform` and nothing else is shareable. Cross-schema writes are
forbidden; lifecycle rides Redis Streams.
