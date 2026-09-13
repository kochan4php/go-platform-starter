# Frontend engineering standard

This document records the implementation and decisions for backlog Q1-Q64. The
host and federated applications share contracts from `@starter/contracts` and
presentation primitives from `@starter/ui`; a second application framework is
not introduced.

## State ownership

| State | Owner | Persistence | Examples |
| --- | --- | --- | --- |
| Server data | TanStack Query | memory cache with per-query stale/retry policy | users, roles, permissions |
| Session | `AuthProvider` reducer | access token in memory; refresh token in an HTTP-only cookie | user, bootstrap, expiry, heartbeat |
| Navigable state | URL | browser history | route, reset token, resource identity |
| View preferences | shared SSR-safe storage hook | local storage plus storage-event sync | theme, locale, density |
| Ephemeral UI | local component state | none | modal, input draft, drag state |

No general-purpose client store is justified. Query data must not be copied into
context, and form drafts must not be placed in the query cache. Authentication
uses a reducer because its transitions are related; login and logout are also
broadcast to other tabs. Visibility-triggered refresh updates the session
heartbeat shown in the top bar.

## Forms, contracts, and errors

- Native controlled forms remain the default. `react-hook-form` and its resolver
  are rejected for the current form size: they would duplicate the existing
  field/error primitives without reducing meaningful complexity (Q5).
- `scripts/generate-contract-modules.mjs` generates strict Zod request schemas
  from the composed OpenAPI document. Auth forms consume those shared schemas.
- API envelopes are checked with `safeParse`. `AppError` carries a stable code,
  HTTP status, and retryability. Query retries stop after two failures and never
  retry known non-retryable 4xx errors.
- `FormErrorSummary`/auth `ErrorSummary` use assertive live alerts and link errors
  to fields. Errors remain inline as well as summarized.

## Loading and rendering

Lazy pages have an independent `WidgetSuspense` and `WidgetBoundary`, so one
remote failure does not remove the shell or sibling routes. `ProgressiveContent`
defines loading -> empty -> content behavior. Shared card, list, and table
skeletons preserve geometry and expose a loading name to assistive technology.

Current user and role APIs cap pages at 50 rows. The list-render audit therefore
rejects speculative `memo` wrappers and activation of virtualization on those
screens: the comparison overhead is not justified. `useVirtualList` is available
for genuinely unbounded datasets. Permission filtering uses `useTransition`, so
urgent typing is not blocked by regrouping work.

## Accessibility

The host exposes a keyboard-visible skip link and one `main` region. Auth and
dashboard layouts use `header`, `nav`, `main`, `aside`, and `footer` landmarks
without nested duplicate mains. Data tables require a caption and column/row
header `scope`. Public routes and every protected admin route are scanned by axe
in Playwright CI.

Manual screen-reader release check:

1. NVDA + Firefox on Windows: traverse landmarks, activate skip navigation,
   submit each invalid auth form, read users table headers, and operate the role
   permission matrix.
2. VoiceOver + Safari on macOS/iOS: repeat landmark and form-error navigation,
   open/close every modal, and verify focus returns to its trigger.
3. At 200% zoom and keyboard only: ensure no content is lost, focus order follows
   reading order, drag/reorder alternatives are operable, and live status does
   not interrupt ordinary navigation.
4. Record browser/reader versions, route, result, and issue link in the release
   evidence. Automated axe is a gate, not a replacement for these checks.

### Contrast audit

Ratios use WCAG relative luminance. Normal text requires 4.5:1; large text and
non-text controls require 3:1.

| Theme pair | Ratio | Result |
| --- | ---: | --- |
| dark ink / canvas | 18.07:1 | pass |
| dark muted / canvas | 7.77:1 | pass |
| dark accent / canvas | 15.97:1 | pass |
| dark danger / canvas | 7.12:1 | pass |
| dark info / canvas | 9.30:1 | pass |
| light ink / canvas | 12.77:1 | pass |
| light muted / surface | 4.91:1 | pass |
| light accent / surface | 4.89:1 | pass |
| light danger / surface | 4.68:1 | pass |
| light info / surface | 5.44:1 | pass |

Do not communicate state by color alone; badges, trends, and errors include text
or an accessible label.

## Language, design, and motion decisions

- A small typed React context plus native `Intl` is accepted instead of Lingui
  or react-i18next (Q14). Indonesian is the default, English is selectable, the
  document `lang` is synchronized, and plural/date helpers use `Intl` (Q15-Q16).
- `packages/ui/src/styles.css` is the single source for colors, type, radii,
  4/8-derived spacing, and semantic z-index tokens (Q17). Phosphor icons use the
  regular weight unless an intentional state variant is documented.
- Dark and light palettes are complete. With no explicit preference, the host
  follows `prefers-color-scheme` and reacts to operating-system changes.
- Fluid page headings use the same `clamp()` ranges. Tailwind breakpoints remain
  unmodified: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 pixels.
- `.ui-container` establishes inline-size containment and
  `.ui-container-stack` adapts below 32rem independently of the viewport.
- Framer Motion is rejected (Q20). CSS transitions, the View Transition API, a
  capped 40/80/120ms page stagger, button press scale, and the global
  `prefers-reduced-motion` override cover current interactions with no runtime
  dependency.
- Printing removes navigation/actions, expands the main scroll region, and
  renders tables with high-contrast borders.

## PWA, privacy, and experiments

The PWA decision is accepted (Q33) as a minimal, safe shell: a manifest, install
icon, navigation-only service worker, and static offline fallback. The worker
does not cache API responses, access tokens, or authenticated HTML.

Web Push is rejected for now (Q35). It requires a product use case, explicit
permission UX, VAPID lifecycle, and unsubscribe/retention policy before any
browser prompt or dependency may be added.

Analytics is limited to first-party operational error and Web Vitals telemetry
(Q36). There is no third-party tracker, advertising identifier, or analytics
cookie. Breadcrumbs send only explicit `data-telemetry` names or generic tag
names; labels, input values, element IDs, query strings, and URL fragments are
not collected.

Runtime boolean flags are accepted through `useFeatureFlag` and
`window.__STARTER_FLAGS__` (Q37). Defaults must be safe when config is absent.
A/B testing is rejected (Q38) until there is an approved hypothesis, stable
assignment, consent basis, exposure event, success metric, and deletion date.

## Shared component and hook inventory

`@starter/ui` owns debounce/throttle, SSR-safe local storage, media query and
virtual-list hooks; accessible date range, dropzone, lightbox, empty state,
trend, timeline and reorder components; skeleton variants, semantic badges, and
one tooltip implementation. Reorder supports native drag plus keyboard-visible
move controls. The host already owns promise-based confirm and clipboard-to-toast
hooks. Route metadata drives navigation and breadcrumbs; `AccessGuard` composes
permissions, roles, and a custom predicate.

Biome is the only JavaScript/TypeScript linter. Recommended rules plus explicit
hook ordering and exhaustive dependency rules are errors. ESLint and its React
Compiler plugin are prohibited by the project supply-chain policy. Compiler
transformation remains disabled; this preserves the lint safety goal in Q41
without adding the disallowed toolchain.

## Verification

Run these before merge:

```powershell
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
```

The PWA offline route should additionally be checked once in a production build:
load the application, switch DevTools to offline, navigate, and verify the static
fallback appears without showing cached private data.
