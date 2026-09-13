# Upgrading

## Between minor releases

1. Read the changelog, release notes, ADRs, API changelog, and migration pairs
   from the current tag to the target tag.
2. Back up and complete a disposable restore rehearsal.
3. Verify deprecated API usage and regenerate downstream SDKs.
4. Deploy target images and additive migrations to lab; run smoke, contract,
   and migration checks.
5. Promote the same digests to UAT with production-like data volume and record
   migration duration, locks, p95, errors, stream lag, and rollback evidence.
6. Schedule production, apply migrations once, roll applications gradually,
   and keep the prior image digest available.
7. Remove old columns/paths only in a later release after the compatibility
   window and usage evidence permit it.

## Environment-by-environment

| Environment | Procedure | Exit gate |
| --- | --- | --- |
| lab | `./scripts/deploy-lab.sh`, regenerate contracts/docs, full smoke | all health, tests, and generated checks green |
| UAT | `./scripts/deploy-uat.sh` with isolated env/state | acceptance, restore evidence, no alert regression |
| production | `./scripts/deploy.sh prod` using UAT-tested digests | health, synthetic login, p95/5xx, streams, audit |

Do not copy lab secrets or volumes upward. UAT/demo/prod each use their own
protected env file, Compose project, database volume, Redis data, and domain.
Application rollback does not imply schema rollback; see
[RELEASE.md](RELEASE.md) and [MIGRATIONS.md](MIGRATIONS.md).
