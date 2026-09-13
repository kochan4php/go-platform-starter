# Secrets and key rotation

Services accept either `NAME` or `NAME_FILE`. The file convention works with
Vault Agent, cloud secret-store CSI drivers, Docker secrets, and External
Secrets Operator; a direct value wins during migration.

Key rings use `active,previous` order. `ACCESS_TOKEN_SECRET` may use
`kid:secret,kid:previous`; JWT verification accepts both. `INTERNAL_SECRET`,
`SESSION_CRYPTO_KEYS`, `STREAM_SIGNING_KEYS`, and `STREAM_ENCRYPTION_KEYS`
accept the active key first and old keys afterward.

Rotation: publish both keys, roll verifiers, move the new key first, roll
producers, wait longer than the longest token/grace window, remove the old key,
and roll verifiers again. Never reuse a key across purposes.

`infra/k8s/security/secret-rotation.yaml` automates the monthly Vault ring
advance with `concurrencyPolicy: Forbid`; replace the example Vault address and
token bootstrap with workload identity before applying. ESO refreshes service
Secrets after Vault changes. `certificates.yaml` configures cert-manager ACME
renewal and private-key rotation. Alert if either CronJob/Certificate reports a
failed condition, and rehearse removal of the previous signing key in UAT.

`infra/k8s/security` contains ESO/Vault, API-server KMS, cosign admission,
audit, NetworkPolicy, and Falco templates. Bind their placeholders to the real
cluster before applying. `infra/redis/users.acl` separates gateway, producer,
consumer, and DLQ-admin access. Every DLQ replay requires an audited ticket.
Production Compose renders this policy from generated per-service passwords;
Kubernetes secret templates expect the same usernames and passwords from the
managed Redis ACL and external secret store.
