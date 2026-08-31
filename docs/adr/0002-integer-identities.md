# ADR-0002: Integer identities

Status: accepted
Date: 2026-08-25
Deciders: platform maintainers
Supersedes: none
Superseded by: none

## Context

Early drafts mixed UUID profile identifiers with numeric auth and RBAC keys.
That forced conversion at every event and query boundary without providing
cross-region generation or privacy value for this starter's scale.

## Decision

Use PostgreSQL `BIGINT` identities for users, roles, sessions, and references.
The authenticated subject is the decimal representation of the user ID. Public
APIs may later add opaque external IDs without changing internal foreign keys.

## Consequences

Joins, pagination, and event payloads share one representation. IDs remain
enumerable, so authorization must never depend on obscurity; every resource
handler continues to enforce ownership or explicit `*:any` permission.
