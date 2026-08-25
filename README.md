# go-platform-starter

Platform microservices **Go** di balik satu Go gateway, dengan **React
micro-frontend shell** — satu Go module, pnpm workspace, kontrak API
spec-first OpenAPI. Ukuran default untuk ~100k user. Setiap deployable
membawa Dockerfile + Jenkinsfile tipis + docker-compose + manifest k8s
dengan HPA.

```
                        ┌──────────────── edge nginx :80/443 ────────────────┐
   browser ────────────►│  /            → web (federation host)              │
                        │  /remote/auth/…→ web-auth · /remote/admin-users/…  │
                        │  /api/v1/… /docs → gateway :8000                   │
                        │  /ws           → gateway → realtime                │
                        └────────────────────────────────────────────────────┘

 gateway :8000 ──► auth :8080 · users :8080 · rbac :8080 · worker :8080 · realtime :8080
                       │            │          │         │             │
                  Postgres (schema auth/users/rbac/audit)   Redis (cache·streams·pub/sub)
```

---

## Fitur utama

**Backend (Go ≥1.27, chi v5, GORM, Redis 7)**

- **auth** — register/login/logout, refresh token dengan *rotasi + reuse
  detection* (replay mematikan satu keluarga sesi), lupa/reset password
  single-use (jti via GETDEL), lockout Redis atomic yang dicerminkan ke DB,
  uniform-401 termasuk pertahanan timing via dummy-hash, manajemen sesi
  (`GET/DELETE /sessions`), bcrypt cost dapat dikonfigurasi.
- **users** — profil CRUD + `/me` murni dari identity header (nol cross-service
  call), list paginated `{items, meta:{limit,offset,total}}`.
- **rbac** — CRUD role/permission + sinkronisasi permission yang menaikkan
  `ver` klaim user terdampak (paksa refresh token); katalog permission
  compile-time di `internal/platform/permissions`; seeder katalog + role admin.
- **gateway** — verifikasi JWT **sekali di edge**, registry rute fail-closed
  dari spec OpenAPI tiap service (`x-required-permission`, izin tak dikenal =
  tolak boot), CORS + body limit + rate limit edge (redis_rate), agregasi
  dokumen OpenAPI + UI Scalar di `/docs`, proxy WebSocket `/ws`.
- **realtime** — WebSocket handshake JWT via subprotocol (bukan query param),
  room join/leave/broadcast dengan allowlist + kapasitas, presence gauge,
  kick paksa saat force-logout lewat Redis pub/sub.
- **worker** — consumer group Redis Streams (`mail.jobs`, `audit.events`)
  membaca dari awal stream, redelivery XAUTOCLAIM, DLQ setelah 5 attempt,
  handler idempotent (marker SETNX pasca-kirim email; `msg_id` unik +
  `ON CONFLICT` untuk audit flush), pengirim email via platform mailer
  (console|smtp), scheduler housekeeping terkunci redis-lock.
- **platform kit bersama** (`internal/platform`) — env fail-fast, slog JSON
  dengan request-id + trace-id, middleware trace/metrics/correlation/
  slow-request/security-headers/recoverer, envelope respons seragam,
  pagination helper, jembatan GORM→slog (slow query), OpenTelemetry OTLP,
  error-reporter port (noop|Sentry), mailer port, redis-lock scheduler.

**Frontend (Vite, React 19, Tailwind v4, TanStack Query)**

- `apps/web` federation host: router, auth context (token akses **di memori**,
  refresh httpOnly cookie), guard `<RequirePermission>` sebagai hint UI.
- Remote top-level: `web-auth` (login/register/forgot/reset),
  `web-admin-users` (tabel paginated + modal create/edit/delete),
  `web-admin-roles` (editor role + checkbox sync permission).
- `packages/contracts`: tipe TypeScript **generated** dari spec agregat statis
  + wrapper `openapi-fetch` (bearer attach, 401 → silent refresh → retry
  sekali).
- `packages/ui`: design tokens Tailwind v4 + primitif (Button, Input, Field,
  Card, Alert, Modal, tabel).
- MSW mock mode untuk dev offline; Vitest+RTL per remote; Biome lint/format;
  bundle-budget gate pada build host; import-boundary checker antar workspace.

**Operasi**

- Semua deployable: Dockerfile multi-stage (distroless/nginx), Jenkinsfile
  tipis (shared library `goPlatformService`/`goPlatformWeb`), compose
  fokus-per-service, manifest k8s `deployment/service/hpa(+migrate-job)`,
  `.env.example`.
- Observability compose (`--profile obs`): Prometheus + Grafana provisioned +
  OTel collector.
- CI: commitlint, golangci-lint (gosec), test Go vs kontainer PG+Redis asli,
  Biome, Vitest, freshness kontrak, build semua app, budget bundel,
  import-boundary, Playwright smoke vs mesh hidup, Trivy + semgrep.
- Release otomatis (release-please) + image tag per komponen via Jenkinsfile.

---

## Struktur repositori

```
go-platform-starter/
├── go.mod                     # SINGLE module — isolasi antar service oleh compiler
├── Makefile                   # lint fmt vet build test run dev contracts env
├── package.json               # akar pnpm: lint/test/build/e2e/check:budget/check:deps
├── services/
│   ├── _template/             # scaffold blank — bentuk sama dengan service lain
│   ├── gateway/               # edge: JWT, registry fail-closed, proxy, docs, rate limit
│   ├── auth/                  # kredensial & sesi        [schema: auth]
│   ├── users/                 # profil                   [schema: users]
│   ├── rbac/                  # role & permission        [schema: rbac]
│   ├── realtime/              # websocket rooms/presence
│   ├── worker/                # streams consumer         [schema: audit]
│   └── <svc>/
│       ├── openapi.yaml       # SUMBER KEBENARAN API (codegen input)
│       ├── codegen.cfg.yaml   # oapi-codegen pinned via go.mod tool directive
│       ├── gen/               # stub hasil generate — committed, CI cek stale
│       ├── migrations/        # pasangan SQL bernomor, embedded (go:embed)
│       ├── internal/          # handler/repo/service — tak bisa diimpor service lain
│       ├── Dockerfile · Jenkinsfile · docker-compose.yml · .env.example
│       └── deploy/k8s/{deployment,service,hpa,migrate-job,secret.tpl}.yaml
├── internal/
│   ├── platform/              # kit bersama (lihat daftar fitur atas)
│   └── testutil/              # harness testcontainers-go Postgres+Redis
├── apps/
│   ├── web/                   # HOST federasi: router + auth context + guards
│   ├── web-auth/              # remote: layar autentikasi
│   ├── web-admin-users/       # remote: tabel user admin
│   ├── web-admin-roles/       # remote: editor role
│   └── <app>/                 # package.json · vite.config.ts · src/ · ops files
├── packages/
│   ├── contracts/             # gen/openapi.json + src/gen.d.ts + client fetch
│   └── ui/                    # styles.css (tokens) + primitives React
├── infra/
│   ├── compose.base.yml       # SELURUH mesh lokal (dev/demo)
│   ├── compose.prod.yml       # stack produksi + one-shot migrate/seed (profile tools)
│   ├── .env.production.example# template env produksi (yang asli gitignored)
│   ├── go.env                 # env bersama dev untuk compose.base
│   ├── nginx/conf.d/default.conf      # edge produksi same-origin
│   ├── nginx/conf.d/edge.tls.conf.template  # template HTTPS (aktif manual)
│   ├── prometheus/ grafana/ otel/     # provisioning observability
│   └── jenkins/vars/          # shared library Jenkins (Go & web)
├── scripts/
│   ├── deploy.sh              # ⭐ auto-deploy produksi untuk VPS
│   ├── e2e-mesh.sh            # boot mesh uji (up|down|ci) untuk Playwright
│   ├── resilience-drill.sh    # drill: kill service under load → degradasi → pulih
│   ├── perf-smoke/main.go     # alat ukur RPS/persentil tanpa dependensi
│   ├── check-budget.mjs       # gate ukuran bundel host
│   ├── check-deps.mjs         # batas impor antar workspace web
│   └── compose-specs.mjs      # gabung services/*/openapi.yaml → spec agregat
├── e2e/smoke.spec.ts          # Playwright: login → tabel admin → logout
├── bruno/                     # koleksi API full journey (register→admin CRUD→ws)
├── docs/                      # ARCHITECTURE SCALING ONBOARDING CONTRACTS SECURITY
│                              # TOKEN_POLICY QUERY_KEYS API_VERSIONING MIGRATIONS DOD
└── .github/workflows/         # ci.yml (go/web/playwright/security) · release.yml
```

### Aturan struktural

1. **Satu `go.mod`.** Isolasi service ditegakkan compiler: kode service ada di
   `services/<svc>/internal/…` yang ditolak Go bila diimpor service lain;
   depguard menambah larangan eksplisit.
2. **Setiap deployable mandiri** — file operasinya di sebelah sumbernya;
   compose base menyusun semuanya.
3. **Jenkinsfile tetap tipis** — logika pipeline ada di shared library.
4. **Spec-first**: perilaku yang tidak ada di `openapi.yaml` tidak dianggap
   ada. Stub generated committed; CI gagal bila kedaluwarsa.

### Kontrak data & event

| Schema | Pemilik | Dilarang menyimpan |
| --- | --- | --- |
| `auth` | kredensial + sesi | field profil |
| `users` | profil per `sub` | kredensial |
| `rbac` | role/permission/user_roles | apa pun di luarnya |
| `audit` | trail append-only (**hanya worker yang menulis**) | data bisnis |

Dilarang tulis lintas schema. Siklus hidup melewati Redis Streams:

| Stream/Event | Produsen → Konsumen |
| --- | --- |
| `users.events:user.created` | auth → users (materialize profil) |
| `users.events:user.deleted` | users → users+auth (hapus profil, purge kredensial) |
| `mail.jobs:email.send` | auth → worker (kirim SMTP) |
| `audit.events:audit.entry` | semua api → worker (flush ke `audit.audit_logs`) |
| `purge:profiles` (list) | users → sweep terjadwal users |

Consumer group mulai di posisi `0` sehingga event pra-deploy ikut diproses.
Detail payload: [docs/CONTRACTS.md](docs/CONTRACTS.md).

---

## Menjalankan seluruh mesh lokal (dev/demo)

```bash
docker compose -f infra/compose.base.yml up --build
```

Mem-boot Postgres + Redis + enam service + empat web app, migrasi semua
schema, dan seed katalog role + admin bootstrap.

| URL | Apa |
| --- | --- |
| http://localhost:5173 | shell app (login → admin) |
| http://localhost:8000/docs | referensi API agregat (Scalar) |
| http://localhost:8000/healthz | kesehatan edge |

Admin seed: `admin@example.local` / `admin-bootstrap-pw`.

Observability di atasnya:

```bash
docker compose -f infra/compose.observability.yml --profile obs up
# Grafana http://localhost:3000 · Prometheus http://localhost:9090 · OTLP :4318
```

## Pengembangan harian

Dua toolchain: **Go ≥1.27** dan **Node ≥22 + pnpm 11** (`corepack enable`).

```bash
# sisi Go
make build && make test          # test kontainer auto-skip tanpa Docker
make run SVC=auth                # atau make dev SVC=auth (hot-reload air)
make contracts SVC=users         # regenerasi stub setelah edit openapi.yaml

# sisi web
pnpm install
pnpm contracts && pnpm lint && pnpm check:deps && pnpm test
pnpm build && pnpm check:budget

# VITE_API_MOCK=on pnpm --filter web dev   # MSW mock mode offline
```

Compose fokus per service tersedia (`services/<svc>/docker-compose.yml`).
Path PR 30-menit lengkap: [docs/ONBOARDING.md](docs/ONBOARDING.md).

## Testing

| Lapisan | Alat | Cakupan |
| --- | --- | --- |
| Unit + integrasi Go | stdlib testify testcontainers (PG+Redis asli) | lockout matrix, rotasi refresh, reset-single-use, redelivery/DLQ worker, audit viewer, e2e gateway |
| Web unit | Vitest + RTL (+ vi.mock api) | guard permission, login flow, tabel/modal, roles list |
| Smoke E2E | Playwright | login → tabel admin → logout melawan mesh nyata (`scripts/e2e-mesh.sh ci`) |
| Drill | bash | resilience (kill-under-load), perf baseline (`scripts/perf-smoke`) |

## Observability & keamanan

- `/metrics` Prometheus per service + dashboard Grafana provisioned
  (rps, p95, error ratio, lag stream worker, koneksi realtime).
- Trace OTLP: span parent di gateway, `traceparent` mengalir antar hop,
  `trace_id` tampil di baris slog tiap request; slow-request & slow-query
  logging dengan ambang env.
- Cookie hanya `refresh_token` (`httpOnly`, SameSite=Lax, Secure by env);
  token akses di memori — lihat [docs/TOKEN_POLICY.md](docs/TOKEN_POLICY.md).
- Security headers helmet-parity di semua service Go; posture CSRF dan
  pemindaian (gosec/Trivy/semgrep): [docs/SECURITY.md](docs/SECURITY.md).

---

# Deployment produksi (VPS)

## Prasyarat

- VPS Ubuntu/Debian (atau distro apa pun dengan Docker), ≥2 GB RAM.
- Port **80** (dan 443 bila TLS) publik. Tidak ada port lain yang diekspos.
- Domain A/AAAA record mengarah ke VPS (opsional tapi disarankan; tanpa
  domain pun stack tetap jalan via IP).

## Cara cepat

```bash
git clone https://github.com/kochan4php/go-platform-starter.git
cd go-platform-starter
sudo DOMAIN=example.com ./scripts/deploy.sh
```

Script akan:

1. memasang Docker + compose plugin bila belum ada (`--install-docker`);
2. `git reset --hard origin/main` (lewati dengan `--no-pull`);
3. membuat `infra/.env.production` berisi **secret acak** (`openssl rand -hex
   32`, chmod 600) bila belum ada — password admin bootstrap ikut digenerate
   dan tersimpan di file itu;
4. membangun semua image (cache-aware);
5. menjalankan migrasi tiap schema sebagai job one-shot **sebelum** rollout;
6. `up -d` seluruh stack (restart policy `unless-stopped`, log dirotasi);
7. seed idempotent: katalog role + bootstrap admin;
8. health-gate `GET /healthz` melalui edge sebelum menyatakan sukses.

Update berikutnya cukup jalankan perintah yang sama. Rollback:
`git checkout <sha-lama> && ./scripts/deploy.sh --no-pull`.

> Jalankan sebagai root/sudo — edge mem-bind port 80. Untuk mencoba tanpa
> domain: `sudo DOMAIN=<ip-vps> ./scripts/deploy.sh` lalu sunting
> `PUBLIC_WS_URL`/`TRUSTED_DOMAINS` di env file sesuai kebutuhan.

### Referensi variabel `infra/.env.production`

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DOMAIN` | ✔ | hostname publik; dipakai server_name & URL ringkasan |
| `PUBLIC_WS_URL` | ✔ | `wss://domain/ws` (TLS) atau `ws://domain/ws` |
| `TRUSTED_DOMAINS` | ✔ | origin CORS gateway, pisah koma |
| `POSTGRES_PASSWORD` | ✔ | digenerate otomatis |
| `ACCESS_TOKEN_SECRET` | ✔ | ≥32 karakter acak |
| `INTERNAL_SECRET` | ✔ | secret header antar-service |
| `ADMIN_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | ➖ | seed admin pertama |
| `MAILER_DRIVER` `SMTP_*` `MAIL_FROM` | ➖ | kirim email nyata (default console) |
| `SENTRY_DSN` | ➖ | aktifkan adapter Sentry |

### Mengaktifkan HTTPS

Template tersedia di `infra/nginx/conf.d/edge.tls.conf.template`:

1. Terbitkan sertifikat (mis. `certbot certonly --standalone -d example.com`).
2. Salin template menjadi `edge-ssl.conf` di folder yang sama, sesuaikan path
   sertifikat & `server_name`.
3. Buka komentar port `"443:443"` pada service `edge` di
   `infra/compose.prod.yml` dan mount direktori sertifikat.
4. Ubah `PUBLIC_WS_URL` menjadi `wss://…` lalu `deploy.sh` lagi.

### Operasional harian

```bash
export C="docker compose --env-file infra/.env.production -f infra/compose.prod.yml"
$C ps                       # status
$C logs -f gateway          # ikuti log satu service
$C exec postgres pg_isready # cek db
$C down                     # hentikan (volume aman)
$C down -v                  # ⚠ hapus data
SEED_ADMIN=false ./scripts/deploy.sh --skip-build   # rollout tanpa reseed
```

### Topologi produksi

- **Satu pintu**: hanya container `edge` (nginx) yang expose 80/443.
  Same-origin untuk shell, remote (`/remote/<name>/`), API (`/api`),
  docs (`/docs`), dan websocket (`/ws`) — nol permukaan CORS.
- Postgres & Redis hanya di jaringan internal compose; volume bernama untuk
  data.
- Migrasi berjalan sebagai job eksplisit sebelum rollout (model eksekusi yang
  sama dengan `migrate-job.yaml` di k8s); pod hanya memverifikasi versi saat
  boot sehingga scale-out tidak balapan migrasi.
- Scaling: naikkan `replicas`-style dengan `compose up -d --scale auth=3`
  (consumer group & registry sudah koordinasi-free). Panduan HPA/shard:
  [docs/SCALING.md](docs/SCALING.md).

---

## Dokumentasi lanjutan

| Dokumen | Isi |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | diagram mermaid: topology, skema data, streams, federasi |
| [docs/CONTRACTS.md](docs/CONTRACTS.md) | pipeline spec-first, envelope, identity-header, payload streams |
| [docs/MIGRATIONS.md](docs/MIGRATIONS.md) | konvensi migrasi numbered pairs, aturan expand/contract |
| [docs/TOKEN_POLICY.md](docs/TOKEN_POLICY.md) | penyimpanan token & alur refresh |
| [docs/QUERY_KEYS.md](docs/QUERY_KEYS.md) | konvensi TanStack Query keys |
| [docs/SECURITY.md](docs/SECURITY.md) | CSRF, headers, scanning, secrets |
| [docs/API_VERSIONING.md](docs/API_VERSIONING.md) | freeze `/api/v1`, mekanik deprecation RFC-9745 |
| [docs/SCALING.md](docs/SCALING.md) | pool sizing, HPA math, baseline performa, trigger shard |
| [docs/ONBOARDING.md](docs/ONBOARDING.md) | clone-to-PR 30 menit, tabel alokasi port |
| [docs/DOD.md](docs/DOD.md) | checklist Definition of Done v6 — tereksekusi |

Deferred (non-goal): gRPC antar service, service mesh, multi-region, sharding,
Storybook, i18n framework, Idempotency-Key middleware, cursor pagination,
PgBouncer (sampai metrik koneksinya menuntut), email verification.
