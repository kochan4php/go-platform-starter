# Governance

go-platform-starter uses maintainer-led, consensus-seeking governance.

## Roles

- **Contributors** submit issues, discussions, documentation, and code.
- **Reviewers** are trusted contributors who review within their demonstrated
  areas but cannot merge without maintainer permission.
- **Maintainers** triage, merge, release, handle conduct/security reports, and
  own repository settings. The repository owner appoints or removes them based
  on sustained, constructive contributions.

Current ownership by area is recorded in [docs/OWNERSHIP.md](docs/OWNERSHIP.md)
and enforced where possible by `CODEOWNERS`.

## Decisions

Routine changes use pull-request consensus. A durable decision affecting more
than one service, public contract, security boundary, data ownership, or
operational cost requires an ADR. The author records alternatives and evidence;
maintainers seek consensus for at least two business days. If consensus cannot
be reached, the repository owner makes the smallest reversible decision and
records the rationale in the ADR and [decision log](docs/DECISIONS.md).

Security incident response and urgent production recovery may bypass the normal
window. The change must be reviewed retrospectively within two business days.

## Releases and changes to governance

`main` is the integration branch. Release Please proposes versions and release
notes from Conventional Commits; a maintainer approves the release PR. Changes
to this governance document require maintainer approval and a public PR. The
[Code of Conduct](CODE_OF_CONDUCT.md) takes precedence for community safety.
