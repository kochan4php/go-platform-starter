# CI/CD and release controls

## Pipeline lanes and change impact

`CI` starts independent Go, web, browser, security, schema, and image lanes.
Go tests and web builds are sharded with `fail-fast: false`; superseded runs on
the same branch are cancelled. `scripts/ci-changes.mjs` keeps required jobs
visible while skipping lanes unaffected by a documentation-only or scoped
change. Draft pull requests run commit, lint, contract, and build feedback but
defer container, browser, and security-heavy lanes until ready for review.

`setup-go` reports its cache hit in the job summary. The pnpm store uses an
explicit cache step and reports the primary-key hit. Image publication and
preview builds share the registry cache
`ghcr.io/<owner>/<component>:buildcache`; pull-request builds use the scoped
GitHub Actions cache. Retry is limited to one attempt: a first failure followed by a
pass creates evidence and applies `flaky-test`; it never silently turns a
persistent failure green. Quarantines live in `tests/quarantine` with owner,
issue, and expiry.

Coverage, host bundle size, and Lighthouse summaries are stable PR comments.
Playwright publishes JUnit results. Nightly CI runs the complete unit/race/E2E,
load, and staging-only chaos suite.

## Required repository rules

Protect `main` with pull requests, conversation resolution, linear history,
stale-review dismissal, no force pushes/deletions, and these required checks:

- `commitlint`, `go`, `web`, `schema-docs`, `playwright`, and `security`;
- every `go-test (<shard>)`, `web-build (<app>)`, and
  `docker-build (<component>)` matrix check;
- `Documentation / build` when documentation paths change;
- signed commits where the hosting plan supports enforcement.

Enable automatic deletion of merged branches. Protect `v*` with a tag ruleset:
only the Release workflow may create tags; updates and deletion are forbidden.
Self-hosted Git servers install `hooks/pre-receive`, which enforces annotated,
immutable version tags and scans every pushed range with Gitleaks.

## Environments and promotion

Create GitHub environments `uat`, `demo`, `prod`, `release`, and `preview`.
For `uat` and `demo`, require one maintainer outside the triggering actor. For
`prod` and `release`, require a platform owner plus a service/security owner,
prevent self-review and bypass, and allow only protected tags or `main`.
Environment secrets are `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and
`DEPLOY_KNOWN_HOSTS`; variables are `DEPLOY_PATH` and `DEPLOY_URL`. The
repository cannot create reviewer rules itself, so an owner must configure and
verify these rules in GitHub Settings before the first promotion.

Set repository variables `UAT_URL`, `DEMO_URL`, and `PROD_URL` for the scheduled
drift matrix. They are looked up by matrix key and may be omitted only when that
environment is intentionally excluded from drift checks.

A merge to `main` queues UAT automatically. Demo queues nightly. Production is
manual-only. GitHub environment review remains the approval gate before scoped
secrets are released. `scripts/promote.sh` then checks the freeze calendar,
captures the previous revision, takes a database backup, deploys the requested
immutable revision, runs post-deploy smoke, records actor/time/revision, sends
an optional Slack/Discord webhook, and rolls back the application revision on
failure. `--dry-run` performs no mutation. Scheduled `/version` checks detect
revision drift.

## Preview environments

A maintainer adds the `preview` label to a same-repository PR, or dispatches the
Preview workflow manually. Eleven `pr-<number>` images are built, a namespace
`preview-pr-<number>` is applied from the Kustomize preview overlay, and a link
is posted. The `preview` environment supplies `PREVIEW_KUBECONFIG` and a
namespace-safe `PREVIEW_SECRETS_YAML`; neither is copied from production. The
cluster operator provisions wildcard DNS and
the `letsencrypt-prod` cert-manager ClusterIssuer; the overlay creates the
Ingress and its namespace-local certificate. Closing the PR deletes the
namespace and a merged same-repository branch is deleted. Fork code is intentionally not built with
package or cluster credentials. Build overlays with
`kustomize build --load-restrictor LoadRestrictionsNone` because the shared
base intentionally reuses the component-owned manifests.

## Images, releases, and retention

Every component image receives `sha-*`, `latest` on `main`, and semantic tags
on `v*`. Builds include SBOM and maximal BuildKit provenance plus a GitHub
attestation. Weekly Trivy rescans publish SARIF. Retention preserves the newest
20 versions and all semantic/latest tags, deleting only untagged, preview, and
SHA versions older than 30 days.

Release Please owns the root changelog and GitHub release. A published release
attaches aggregate OpenAPI, dependency licenses, repository SBOM, checksum,
attestation, and per-component changelogs. Release candidates use annotated
`vX.Y.Z-rc.N` tags through the protected `release` environment. Hotfixes branch
from the affected tag, contain one focused fix plus regression evidence, and
return through the same review and promotion chain.

Configure `RELEASE_PLEASE_TOKEN` as a fine-grained token with repository
contents and pull-request write access so the release PR runs normal checks.
Without it, the workflow falls back to `GITHUB_TOKEN`; enable “Allow GitHub
Actions to create and approve pull requests.” Release artifacts run in the same
workflow as tag creation, so they do not depend on a token-generated release
event being emitted.

## Recorded decisions

- Kustomize overlays are the deployment package. Helm was evaluated and
  rejected because this repository has one workload topology and Helm would
  duplicate environment templating without a second distribution consumer.
- Argo CD remains an open decision; push-driven promotion is auditable and
  sufficient until multiple clusters create measurable reconciliation drift.
- Runbook automation stays in versioned scripts and workflows. Add an external
  runbook platform only when non-engineers need delegated, policy-scoped runs.
- GitHub-hosted runners remain the default. Adopt ephemeral self-hosted image
  builders only after p95 image duration exceeds 15 minutes for four weeks and
  the isolation, patching, egress, cache, and cost controls pass security review.
- The repository remains a monorepo; [ADR-0005](adr/0005-monorepo-delivery.md)
  records the boundary and extraction triggers.

## Change freeze

UTC windows live in `infra/change-freeze.yml`. Production exceptions require
incident/change authority and `CHANGE_FREEZE_OVERRIDE=true`; the deployment
audit preserves the actor and run. Never use an override for convenience.
