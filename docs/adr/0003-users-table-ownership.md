# ADR-0003: Move profile data to the users schema

Status: accepted
Date: 2026-08-25
Deciders: platform maintainers
Supersedes: profile ownership implied by ADR-0001
Superseded by: none

## Context

Authentication needs credentials and account state; product-facing profile
fields evolve independently. Keeping both in `auth.users` would make auth a
shared database service and violate schema ownership.

## Decision

`auth.users` owns identity, credentials, security state, and lifecycle.
`users.users` owns email/display projections and profile fields keyed by the
same integer subject. Registration emits `user.created`; the users consumer
materializes the profile idempotently. Deletion and repair also use versioned
events instead of cross-schema writes.

## Consequences

Reads that need profile data use the users projection. Temporary event lag is
expected and observable. Auth remains usable if profile materialization is
delayed, while replay from stream position `0` repairs the projection.
