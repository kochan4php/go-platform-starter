# Backup and restore

## Policy

- PostgreSQL: custom-format logical backup every 24 hours plus WAL archive;
  retain 14 daily copies by default.
- Redis: AOF for local recovery and periodic RDB export for off-host recovery.
- Copy backups to encrypted, access-controlled storage in a different failure
  domain. Backup containers must not hold general application credentials.
- Target RPO is 24 hours for the logical database snapshot and target RTO is 30
  minutes for a single-node rebuild. Operators must record measured values.

## Backup

```sh
BACKUP_DIR=/encrypted/backups \
POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
REDIS_BACKUP_PASSWORD="$REDIS_BACKUP_PASSWORD" \
./scripts/backup.sh
```

Verify a new non-empty PostgreSQL archive and Redis snapshot, checksums, owner
permissions, encryption at rest, and off-host replication. Monitoring must page
when no successful backup arrives within 26 hours.

## Restore rehearsal

Never rehearse against production or a non-empty database.

```sh
BACKUP_DIR=./backups \
RESTORE_TEST_DATABASE_URL='postgres://app:app@127.0.0.1:55433/restore_test?sslmode=disable' \
./scripts/restore-test.sh
```

Validate migrations/checksums, row-count invariants, login, profile/RBAC reads,
stream consumption, audit append, and the absence of production outbound email
or webhooks. Record archive timestamp, restore start/end, actual RPO/RTO, and
every manual step.

## Disaster recovery

1. Freeze writes or route traffic away from the failed site.
2. Provision an empty host and independently verify repository/image signatures.
3. Restore the latest verified PostgreSQL archive and Redis snapshot/AOF.
4. Supply rotated deployment secrets, then run `./scripts/deploy.sh prod --no-pull`.
5. Gate on health, authenticated reads, stream lag, audit writes, and synthetic
   login before reopening traffic.
6. Rotate credentials exposed during recovery and preserve evidence for the
   incident review.

Destructive recovery requires two-person confirmation of environment, target,
backup timestamp, and tested rollback. See [reliability](RELIABILITY.md) for the
full resilience contract.
