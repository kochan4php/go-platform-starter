---
title: Governance
nav_order: 8
has_children: true
---

# Governance

How decisions are recorded, how releases are cut, and who is responsible.

| Page | Read it when |
| --- | --- |
| [Decisions](../DECISIONS.md) | You want the index of accepted product and engineering decisions. |
| [Ownership](../OWNERSHIP.md) | You need to know who maintains what. |
| [Collaboration](../COLLABORATION.md) | You are deciding whether a change wants a pair. Pairing is opt-in, not a default. |
| [Release](../RELEASE.md) | You want to know how Conventional Commits on `main` become a release. |
| [Documentation versioning](../VERSIONING.md) | You are wondering which version of the docs you are reading. |
| [Snapshot 0.1](../versions/0.1.md) | You need the frozen 0.1 baseline. |
| [Dependency licenses](../DEPENDENCY_LICENSES.md) | You need the licence inventory. Generated — do not edit. |
| [Archive policy](../ARCHIVE_POLICY.md) | You are retiring a document rather than deleting it. |

## Repository policies

These live at the repository root rather than in the documentation site,
because GitHub surfaces them in its own interface.

- [Contributing](https://github.com/kochan4php/go-platform-starter/blob/main/CONTRIBUTING.md)
- [Repository governance](https://github.com/kochan4php/go-platform-starter/blob/main/GOVERNANCE.md)
- [Support](https://github.com/kochan4php/go-platform-starter/blob/main/SUPPORT.md)
- [Code of Conduct](https://github.com/kochan4php/go-platform-starter/blob/main/CODE_OF_CONDUCT.md)

## Commits carry the release

Conventional Commits are enforced by commitlint. Release Please reads them from
`main` and opens a release pull request; a commit that does not parse simply
does not appear in the changelog.
