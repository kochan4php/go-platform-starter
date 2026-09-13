# Release process

Release Please turns Conventional Commits on `main` into a release PR and
updates [CHANGELOG.md](https://github.com/kochan4php/go-platform-starter/blob/main/CHANGELOG.md). Maintainers do not hand-edit released
sections or reuse tags.

## Before merge

- CI is green, generated artifacts are fresh, and release notes in the PR
  template explain user-visible impact or explicitly say `none`.
- Contract removals, migrations, security boundaries, and rollout/rollback are
  reviewed by their owners.
- Breaking changes follow [API versioning](API_VERSIONING.md) and include an
  [upgrade guide](UPGRADING.md).

## Cut a release

1. Review the Release Please PR: semantic version, changelog grouping, migration
   notes, contributors, and links.
2. Re-run required checks on its head and merge without rewriting its commit.
3. Verify the signed GitHub release/tag and immutable component image tags.
4. Deploy to lab, then UAT. Record `/version`, smoke results, migration duration,
   and dashboards.
5. Promote the same image digests to production through the health-gated deploy.

## Rollback and hotfix

Rollback uses the prior image digest while additive schemas remain. Never
automatically run down migrations. A hotfix branches from the released tag,
adds a regression test, passes normal gates, and returns through `main`; no
force-pushed or unreviewed release tags.

Release candidates are annotated `vX.Y.Z-rc.N` tags created only by the manual
Release workflow after protected-environment approval. Promote the same image
digests through UAT before publishing the final semantic tag.

After production, verify health, 5xx/p95, login, stream lag, DLQ, audit writes,
and error budget. Link the release to its deploy annotation and incident if one
occurred.
