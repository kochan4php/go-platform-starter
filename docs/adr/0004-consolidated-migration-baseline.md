# ADR-0004: Consolidated migration baseline

Status: accepted
Date: 2026-08-25
Deciders: platform maintainers
Supersedes: historical pre-release migration chains
Superseded by: none

## Context

Before the first supported release, long exploratory migration chains added
noise and produced states no deployed environment needed to preserve.

## Decision

Each schema starts with a consolidated, reversible baseline that represents the
first supported release. From that release onward, applied migrations are
immutable and every change uses a new numbered up/down pair. CI verifies
checksums, ordering, reversibility, timeouts, and expand/contract safety.

## Consequences

Fresh installation stays fast and deterministic. There is deliberately no
upgrade path from unsupported pre-release databases; supported releases use
[the migration and upgrade guides](../UPGRADING.md).
