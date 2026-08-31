# Infra and operations

This is the production contract for a small VPS deployment. OpenTofu creates
the host and provider firewall, Ansible converges the operating system, Docker
Compose runs the application, and the existing Kubernetes manifests remain the
scale-out destination. Commands assume an operator-approved maintenance or
deployment window.

## Provision and bootstrap

1. Copy `infra/tofu/terraform.tfvars.example`, remove the token from the file,
   and export it as `TF_VAR_hcloud_token`. Set real SSH key IDs and restricted
   administrator CIDRs.
2. Run `tofu -chdir=infra/tofu init`, `tofu -chdir=infra/tofu plan -out plan`,
   review the firewall and replacement actions, then `tofu -chdir=infra/tofu apply plan`.
3. Put the resulting address in `infra/ansible/inventory.example.yml`, install
   `infra/ansible/requirements.yml`, and run
   `ansible-playbook infra/ansible/site.yml --check --diff` before the real run.
4. Clone the repository to `/srv/go-platform`, provision SOPS-decrypted runtime
   secrets, set `platform_enable_app_service: true`, and rerun the playbook to
   enable `go-platform.service`.

The OpenTofu state is sensitive and belongs in an encrypted, locked remote
backend; never commit it. The provider firewall and UFW both admit only HTTP,
HTTPS, and SSH from `platform_admin_cidrs`. `scripts/vps-firewall.sh` is the
standalone, dry-run-first recovery path.

## Host security baseline

The playbook implements the repeatable baseline:

- key-only SSH, no root login, three authentication attempts, and a restricted
  user; keep provider console access until a second SSH session succeeds;
- fail2ban for SSH and repeated 401/403/429 responses from login/refresh;
- optional CrowdSec nginx acquisition and firewall bouncer. Install CrowdSec
  from its signed repository first, then set `platform_crowdsec_enabled: true`;
- unattended security upgrades, chrony, auditd, logrotate, and UFW;
- `somaxconn`, SYN backlog, file handles, reverse-path filtering, and conservative
  swap tuning under `/etc/sysctl.d/99-go-platform.conf`;
- audit watches for SSH, sudo, Docker, and deployment configuration. Forward
  journald/audit records to the central log destination and retain access events
  for the organization policy period.

Review the host against the applicable CIS Ubuntu Server Level 1 profile after
every image refresh. Exceptions must name the control, owner, compensating
control, and expiry. At minimum validate filesystem permissions, bootloader,
kernel modules, logging, time sync, firewall, SSH, sudo, and update settings.

Administrative SSH should normally enter a small bastion with MFA/provider
identity controls and agent forwarding disabled, then use `ProxyJump` to a
private address. Restrict the target SSH firewall to the bastion CIDR and keep
break-glass console access independently tested.

## Capacity, monitoring, and housekeeping

`node-exporter` feeds the provisioned **VPS resources** Grafana dashboard.
Prometheus warns at 80% disk use, 85% sustained CPU, and less than 15% available
memory; disk becomes critical below 15% free. The weekly systemd timer removes
only unused images and build cache older than seven days—never volumes. Run
`systemctl list-timers` and test alert routing after bootstrap.

Start sizing with measured peak concurrency, not registrations:

| Active users | Starting VPS | Notes |
| ---: | --- | --- |
| up to 250 | 2 vCPU / 4 GiB / 80 GiB | single host, 2 GiB swap |
| 250–2,000 | 4 vCPU / 8 GiB / 160 GiB | managed/external backup strongly preferred |
| 2,000–10,000 | 8 vCPU / 16 GiB / 320 GiB | separate database and Redis after measurement |
| above 10,000 | multi-node or Kubernetes | load test and failure-domain review required |

Treat those as test hypotheses. Monthly cost is
`compute + block storage + snapshots + backup egress + DNS/LB + observability`.
Record current provider quotes in the capacity worksheet; add 30% headroom and
a second failure domain before promising an SLA.

Vertical scaling: verify a fresh backup, announce the window, stop writes,
resize, boot, verify disk/filesystem and time, run smoke tests, then observe one
peak period. Roll back by reprovisioning the previous size from the verified
backup. Scale horizontally only after session state is external, images are
immutable, migrations are backward-compatible, and an LB removes a node after
two failed health checks. Drain traffic, wait for in-flight requests, deploy,
then require `/healthz`, `/readyz`, and a synthetic login before rejoining.

The Kubernetes exit is staged: push the same digest-pinned multi-architecture
images, externalize state, validate the existing Kustomize overlay in UAT,
mirror secrets through the approved store, canary traffic, then move DNS. Keep
the VPS rollback target until restore, telemetry, and SLO gates pass.

## Docker, networking, and service discovery

The managed Docker configuration uses bounded local logs, live restore, no
userland proxy, non-overlapping address pools, optional IPv6, and optional
`platform_registry_mirrors`. A registry mirror must use TLS, access controls,
upstream allowlists, vulnerability scanning, and an explicit cache retention
policy. Verify a digest after mirrored pulls.

For IPv6, allocate a routed prefix, add matching provider/UFW rules, publish
AAAA only after the same TLS and synthetic checks pass over IPv6, and keep ICMPv6
for path MTU discovery. Do not assume an IPv4 allowlist covers IPv6.

`infra/coredns/Corefile` is the small private-DNS pattern for hosts outside the
Compose network. Replace documentation addresses, bind it only to the private
interface, keep a second resolver, and use short TTLs during migration. Compose
services continue to use Docker DNS names.

Blackbox Exporter probes two DNS resolvers. For authoritative failover, probe
the application hostname from two external regions; alert before changing a
30–60 second record to a pre-provisioned, independently healthy target. DNS is
not a fast in-flight connection drain, so retain LB health removal as the first
line of failover.

At the edge, use provider anti-DDoS capacity, connection/request limits, small
body limits, timeouts, and per-account plus per-IP auth throttles. During an
attack, preserve logs, tighten challenge/rate rules, protect origin IPs, and do
not block health/administrative paths without a tested alternate route.

## Backup, secrets, and immutable releases

The production backup container writes a PostgreSQL plus Redis archive directly
into an `age`-encrypted tarball and deletes plaintext staging files. Configure
`AGE_BACKUP_RECIPIENT`; keep the private identity offline and test decryption on
a disposable host. Copy ciphertext and checksums to a different failure domain.
The scheduled weekly restore check exceeds the quarterly minimum; once per
quarter, run `scripts/quarterly-restore-drill.sh` with a disposable target and
archive its evidence with measured RPO/RTO.

Encrypt declarative secrets with SOPS according to `.sops.yaml`. Replace its
placeholder recipient, commit only encrypted files under `infra/secrets`, and
decrypt to a root-owned tmpfs or pipe at deploy time. Rotate any key exposed on
disk and verify plaintext is absent from Git, logs, swap, backups, and artifacts.

Packer builds the golden Ubuntu snapshot in `infra/packer`. Validate the snapshot
with the same Ansible playbook and vulnerability scan, then update the OpenTofu
image input and replace hosts behind a health gate. Never patch a golden image
manually. Watchtower is deliberately rejected: unreviewed container auto-update
would bypass signed digests, migration gates, smoke tests, and rollback evidence.
Renovate plus the release workflow is the update path.

For a single-host zero-downtime gateway update, run
`scripts/blue-green-deploy.sh` with a digest-pinned `IMAGE`. It starts the idle
color on loopback, waits for health, atomically switches the host-nginx upstream,
reloads nginx, and removes the old color. A failed candidate never changes the
active-color file. Keep stateful migrations backward-compatible and keep nginx
`max_fails`/`fail_timeout` enabled so failed backends leave rotation.

## Availability, residency, and communication

The production availability objective is 99.9% per calendar month (about 43m
49s unplanned downtime); the error-budget dashboards and incident policy govern
release pauses. Planned maintenance is announced at least 72 hours ahead using
the maintenance template, targeted outside peak traffic, and followed by an
all-clear. Whether it is excluded from contractual SLA requires owner approval.

Choose the VPS, backup, log, and support region from the data classification and
customer contract. Record primary/replica/backup regions, subprocessors,
cross-border transfer mechanism, encryption jurisdiction, and deletion proof.
Do not move data regions through a routine scaling change.

If a VPS is compromised: isolate it at the provider firewall without destroying
it, preserve disk and audit evidence, revoke SSH/API/runtime credentials, rotate
session and signing keys, replace the host from a trusted image, restore verified
data, validate audit continuity, notify according to policy, and document the
root cause. Do not clean and reuse the affected host.

`docs/STATUS.md` is generated by GitHub Pages outside the production VPS. Set
repository variable `STATUS_ENDPOINTS` to a JSON array of public health URLs;
the scheduled docs workflow publishes current reachability. It is intentionally
simple and must link incident updates rather than expose internal details.

## Portability and air-gapped operation

Provider-specific code is isolated to `infra/tofu` and `infra/packer`; Ansible,
Compose, OCI images, age/SOPS, Prometheus, and the data formats are portable.
Lock-in risks are provider firewall/resource IDs, snapshot formats, DNS APIs,
egress fees, and managed backup semantics. Quarterly, export state, rehearse a
fresh-host restore elsewhere, and update time/cost estimates.

Exit sequence: lower DNS TTL, provision an equivalent target, bootstrap it,
restore verified encrypted data, mirror digest-pinned images, run synthetic and
load checks, switch traffic, watch one error-budget window, then revoke provider
tokens and request deletion evidence. Retain rollback until the acceptance gate.

For disconnected on-premises deployments, `scripts/export-airgap.sh` packages
digest-pinned amd64/arm64 OCI images, Compose/nginx configuration, checksums, and
restore instructions. Transfer through the approved media scanner, verify both
checksum layers, `docker load`, provide an internal registry/NTP/DNS/SMTP, and
disable all external telemetry and webhooks. Vulnerability feeds and signed
release bundles cross the same controlled import boundary; audit exports leave
only through an approved review path.

CI publishes both `linux/amd64` and `linux/arm64` images. ARM VPS acceptance
requires the same Compose config, native node-exporter, database restore test,
synthetic login, and load target; do not use emulation in production. The MkDocs
site is the centralized operations portal and this page is its VPS entry point.
