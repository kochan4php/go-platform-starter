# Architecture Decision Records

ADRs record durable decisions, not meeting notes. File names use
`NNNN-short-kebab-title.md` and the next number is never reused.

Each ADR starts with these fields:

```text
Status: proposed | accepted | deprecated | superseded
Date: YYYY-MM-DD
Deciders: role or team
Supersedes: ADR-NNNN or none
Superseded by: ADR-NNNN or none
```

An accepted ADR is immutable except for status and cross-links. A new decision
that replaces it gets a new file, sets `Supersedes`, and updates the old file's
`Status` and `Superseded by`. Rejected proposals remain in history with their
rationale. Material implementation drift requires a new ADR or an explicit
reaffirmation in the decision log.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-fresh-build-pivot.md) | accepted | Fresh-build architecture pivot |
| [0002](0002-integer-identities.md) | accepted | Integer identities at persistence boundaries |
| [0003](0003-users-table-ownership.md) | accepted | User profile data owned by users schema |
| [0004](0004-consolidated-migration-baseline.md) | accepted | Consolidated migration baseline before first release |
