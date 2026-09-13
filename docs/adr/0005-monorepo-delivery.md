# ADR-0005: Monorepo delivery

Status: accepted
Date: 2026-08-31
Deciders: platform maintainers
Supersedes: none
Superseded by: none

## Context

The Go services share a module and platform package; web applications share a
pnpm workspace, UI package, and generated contracts. Splitting repositories
would replace atomic contract changes with version choreography and duplicate
pipeline policy.

## Decision

Keep one repository with path-based ownership, impact analysis, sharded tests,
and per-component images/changelogs. A component may be extracted only when it
has an independent owner and release cadence, no cross-repository atomic change
for two consecutive minor releases, and measured CI or access-control cost that
cannot be solved with path gates.

## Consequences

Main remains one integration line, while deployables retain independent images
and rollback. CI must avoid rebuilding unrelated components and contracts stay
committed with their producers and consumers.
