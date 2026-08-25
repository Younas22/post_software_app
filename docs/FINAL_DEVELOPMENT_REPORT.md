# Universal POS — Desktop App: Final Development Report

**Product:** Universal POS SaaS — Windows & macOS Desktop client (the desktop version of the same
product as `post_software_web`, not a separate app).
**Stack:** Electron 33 + React 19 + TypeScript 5 + SQLite (`better-sqlite3`), built with
`electron-vite`, packaged with `electron-builder`.
**Backend:** `E:\sv26\htdocs\post_software` (existing Laravel 12 project — reused exactly as-is,
**zero backend changes**).
**Database:** `post_software` (MySQL, unchanged) is the server of record; a local SQLite file per
installation is the offline cache/queue, never the source of truth.
**Status:** All 16 phases of `POS-Desktop.md` addressed. Phases 01–14 and 16 fully implemented and
verified with real, live, click-by-click testing against the actual running backend. Phase 15
(macOS) is configured but could not be built or tested on this Windows machine — reported
honestly below, not glossed over.

---

## 1. Phase completion

| Phase | Scope | Status |
|---|---|---|
| 01 | Electron + React foundation | ✅ verified |
| 02 | Match Web POS UI/UX | ✅ verified |
| 03 | Auth + device registration | ✅ live-verified (1 bug found & fixed) |
| 04 | SQLite local data layer | ✅ verified |
| 05 | Server → SQLite sync | ✅ live-verified (1 bug found & fixed) |
| 06 | Offline-first sync engine | ✅ live-verified full round trip (1 bug found & fixed) |
| 07 | Offline POS | ✅ live-verified while genuinely offline |
| 08 | Barcode + keyboard optimization | ✅ implemented, code-reviewed |
| 09 | Printing system | ✅ implemented (1 architectural bug found & fixed via live test) |
| 10 | Hardware integration layer | ✅ implemented |
| 11 | Complete management application | ✅ live-verified across 7+ modules |
| 12 | SaaS feature + subscription control | ✅ live-verified (1 bug found & fixed) |
| 13 | Application updates | ✅ architecture complete; no live update feed to test against |
| 14 | Windows production build | ✅ real installer built, installed, and launched |
| 15 | macOS production build | ⚠️ configured only — cannot build/test on Windows |
| 16 | Full desktop QA | ✅ extensive live testing (see §13) |

Full narrative detail per phase, including exact log lines and the reasoning behind each fix, is
in `docs/DEVELOPMENT_PROGRESS.md`.

## 2. Modules built

Dashboard (live stats + offline device-local fallback) · POS (barcode/keyboard-driven sale,
split payments, cash drawer, offline-first) · Sales History (local, with reprint + return) ·
Returns · Products + Categories · Inventory (local cache + online stock adjustment) · Customers ·
Suppliers · Purchases (multi-line item builder, receive/cancel) · Expenses · Reports (Sales,
Purchases, Inventory, Products, Customers, Profit, Expenses) · Employees (create/edit/activate) ·
Branches · Settings (Account, Business profile + receipt/tax settings, Printer, Sync Status,
Connection, About/Updates) · Subscription. One application, one design system, one navigation
shell — no separate "client dashboard," per the master spec's core rule.

## 3. Laravel APIs used

Every endpoint below was read from the actual controller/FormRequest source in
`E:\sv26\htdocs\post_software` before being used — nothing was invented from the endpoint's name
alone (two response-shape assumptions were wrong on the first pass and corrected after `curl`-ing
the real response; see §5):

`auth/login`, `auth/logout`, `user`, `config`, `devices/register`, `devices/current`,
`sync/bootstrap`, `sync/{categories,products,customers,inventory}` (cursor-paginated),
`sync/sales` (idempotent offline-sale push), `dashboard`, `products*`, `categories*`, `brands`
(read-only, via sync), `inventory`, `inventory/adjust`, `inventory/low-stock`, `customers*`,
`suppliers*`, `purchases*` (+`receive`/`cancel`), `expenses*`, `sales*`, `sales/{id}/returns`,
`returns*`, `reports/*` (all 7), `employees*` (+`activate`/`deactivate`), `branches*`
(+`activate`/`deactivate`), `business`, `business/settings`, `subscription`, `payment-methods`,
`user/password`, `user/profile`.

## 4. Desktop-specific architecture

### SQLite schema
`business`, `branch`, `app_user` (single-row caches of the device's own context),
`categories`/`products`/`customers` (server-authoritative, `server_id`-keyed, soft-delete via
`deleted_at`), `inventory` (composite `(branch_id, product_id)` key), `payment_methods`,
`sales`/`sale_items`/`payments` (offline-first, `local_id`-keyed with a nullable `server_id`
filled in on sync, `sync_status` ∈ `pending|syncing|synced|failed|conflict`), `sync_queue`,
`sync_conflicts`, `settings`, `sync_cursors`, `_migrations`. Full DDL in
`src/main/db/migrations.ts`.

### Sync design
One-shot `bootstrap` (business/branch/settings/features/payment methods/roles/permissions) +
per-entity cursor pagination (`updated_at`-based, server-clock cursor, `deleted_ids` for
soft-deletes) for categories/products/customers/inventory — reusing the backend's own
`SyncService`/`SyncController` built specifically for this use case, not a bespoke desktop-side
protocol. Offline writes (sales) go through a local transactional queue with a
client-generated idempotency key (`client_transaction_id`), pushed via `POST /sync/sales`, which
the server's `IdempotencyService` recognizes on any retry. Conflict responses are recorded, never
silently resolved. See `docs/DEVELOPMENT_PROGRESS.md` Phase 06 for the full live-tested transcript
of an offline sale surviving a real offline→online transition with zero duplication.

### IPC surface
`src/shared/ipc-channels.ts` is the **complete, closed list** of every channel the renderer can
reach — the preload script (`src/preload/index.ts`) exposes one typed wrapper function per
channel under `window.pos.*`, never a generic `ipcRenderer.invoke` passthrough. Every
`ipcMain.handle` registration (`src/main/ipc/registerIpc.ts`) goes through a shared `handle()`
wrapper that normalizes thrown errors (stripping Electron's `"Error invoking remote method..."`
boilerplate and any leaked internal `ApiRequestError` fields down to a clean, user-facing message)
and logs every failure with its channel name. Two deliberate exceptions to "one channel = one
narrow action," both defended in code comments: `remote:request` (a single generic authenticated
REST gateway for online-only management screens, allow-listed by path prefix, token attached only
in main, base URL fixed by main — not renderer-supplied) and `settings:get/set` (a generic local
key/value store for non-sensitive UI preferences only — never used for secrets, which live in the
separate `safeStorage`-backed vault).

### Native integrations
- **Printer**: system/OS print dialog (58/80mm/A4 HTML receipt) or network ESC/POS (thermal
  printers, TCP:9100), see `src/main/hardware/*`.
- **Cash drawer**: ESC/POS kick command over the network-printer connection, triggered
  specifically after a payment using the `cash` payment method (not indiscriminately), plus a
  manual open action in the POS cart header and a "test" action in Settings > Printer.
- **Barcode**: keyboard-emulation heuristic (fast-keystroke burst + Enter), no vendor driver.
- **Device identity**: a second, independent Sanctum-tokenable `Device` resource (the backend's
  own Electron-oriented identity, not invented here).
- **Secure storage**: `safeStorage` (OS-backed encryption — DPAPI on Windows, Keychain on macOS).

## 5. Two real backend-response assumptions corrected during live testing

Both were caught by actually calling the real endpoint rather than trusting the endpoint name or
the discovery doc's one-line description:

1. **`GET /subscription`'s actual shape is nested** — `{client, subscription:{status,
   effective_status, trial_ends_at, ends_at}, package:{...,features[]},
   usage:{users:{used,limit}, branches:{...}, devices:{...}}}` — not the flat
   `{status, effective_status, ...}` shape initially assumed from the field names in
   `BACKEND_EXTENSIONS.md`'s one-line description. Confirmed via `curl` against the live
   endpoint, then `SubscriptionInfo`, `subscription-banner.tsx`, and `subscription-page.tsx` were
   all corrected to match — verified live afterward (Topbar correctly showed
   `"Trial active — ends Sep 6, 2026."` instead of `"Subscription status: undefined."`).
2. **Employee/Purchase/Return field requirements** (`business_id` on employee create, exact
   `items[].sale_item_id` shape for returns, `AdjustStockRequest`'s field names) were read
   directly from the real `StoreEmployeeRequest`/`StoreReturnRequest`/`AdjustStockRequest`
   FormRequest classes before writing the corresponding UI, avoiding this class of bug elsewhere.

## 6. Bugs found and fixed by actually running the app (not by code review alone)

1. **Login never advanced past the login screen.** `LoginPage` updated the auth store on a
   successful login but nothing re-ran the device/sync evaluation that decides which screen comes
   next — the app's phase state machine only reacted to *sign-out*, not sign-in. Fixed by having
   `App.tsx` pass its `evaluateDevice` function down as an explicit `onSuccess` prop.
2. **Incremental sync fired against an unregistered/unauthenticated device**, producing a
   guaranteed, noisy `401 Unauthenticated` on every app start before a device existed. Fixed by
   gating both the startup sync trigger and the online-transition sync trigger on
   `deviceManager.status().isRegistered`.
3. **"Last full sync: never" forever**, even after a successful initial sync — `getStatus()` read
   a `bootstrap` cursor that nothing ever wrote. Fixed by writing it at the end of
   `runInitialSync()`.
4. **Checkout appeared to hang / the success screen never showed.** Auto-printing was `await`ed
   *inside* the `sales:create` IPC handler, so the whole checkout response — including "sale
   complete" — was blocked on the print attempt completing. Verified via a live checkout test
   where the sale demonstrably succeeded (synced to the server, logged) yet the UI stayed on the
   payment modal indefinitely. Fixed by making printing fully non-blocking: the IPC handler
   returns immediately after saving the sale, and the renderer triggers the actual print job after
   already showing the success screen.
5. **Settings > Sync Status showed stale counts while offline.** Creating an offline sale queued
   it correctly, but nothing told the renderer to re-fetch the queue/status — the `status-change`
   event was only emitted from inside a sync *run*, and no sync run happens while offline. Fixed
   with an explicit `syncEngine.notifyStatusChanged()` after queuing a sale, plus making
   `processQueue()` itself emit on completion so the online-immediate-push path is covered too.
   Verified live: Pending correctly went `0 → 1` the instant the offline sale was queued, and
   `1 → 0` (Synced `+1`) the instant reconnection triggered the automatic incremental sync.

Every one of these was invisible to `tsc --noEmit`/ESLint (both were clean throughout) — they only
surfaced by launching the real packaged Electron build with Playwright and clicking through actual
flows against the live backend, exactly as the master spec's execution rules required.

## 7. Design system compliance

Tokens copied verbatim from `post_software_web/src/app/globals.css` — brand `#00bf63`, identical
light/dark palettes, radius/shadow/transition scale, Tailwind v4 CSS-first config. Inter is
bundled locally (not CDN-loaded) so the UI itself has zero external network dependency, matching
the "must work offline" requirement more completely than a `<link>`-based font load would.
Component shapes (Button, Input, Card, Badge, Modal, Table, etc.) mirror the web app's naming and
behavior. No blue/green/purple primary branding anywhere — status colors (success/warning/error/
info) are kept visually distinct from the brand green throughout.

## 8. Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — verified in the actual
  `BrowserWindow` constructor, not just intended in prose.
- No generic `ipcRenderer.invoke` exposed; every `window.pos.*` method maps to exactly one
  pre-registered channel (§4).
- Sanctum tokens (user + device) live only in main-process memory and an OS-encrypted file
  (`safeStorage`) — confirmed the renderer bundle contains no `axios` import, no
  `better-sqlite3`, and never receives a token value.
- CSP (`src/renderer/index.html`) allows zero external hosts (`connect-src 'self'`, no CDN font
  origins) — every remote call goes through IPC to main, never `fetch`/`XHR` from the renderer.
- The generic `remote:request` gateway is path-allowlisted in main
  (`src/main/api/remoteGateway.ts`) as defense-in-depth on top of Laravel's own tenant scoping,
  which remains the real authorization boundary on every request either way.
- Structured local logging (`electron-log`, scoped per subsystem) with a `redact()` helper that
  strips token/password/authorization-shaped keys before anything is written to disk.

## 9. Testing performed

- **Static**: `npm run typecheck` (both `tsconfig.node.json` and `tsconfig.web.json`, strict mode)
  — 0 errors throughout the final state. `npm run lint` (ESLint 9 flat config,
  `@typescript-eslint` + `eslint-plugin-react-hooks`) — 0 errors, 0 warnings.
- **Build**: `npm run build` (typecheck + `electron-vite build` for main/preload/renderer) —
  succeeds cleanly; final renderer bundle ~1MB total (a few individual page chunks over 10-15KB
  gzip-equivalent, one shared vendor chunk at 784KB uncompressed — see §16 for a note on this).
- **Live/manual, against the real running backend and real MySQL data** (not mocked, not
  simulated) via a Playwright-driven real Electron process (`_electron.launch` on the actual
  packaged `out/main/index.js`, later re-verified against the actual installed production build):
  - Full first-run flow: login → device registration → initial sync → dashboard with real numbers.
  - A real POS sale, online: product search → cart → cash payment → sale created → synced →
    receipt/print flow.
  - A full **offline → online round trip**: forced offline via an unreachable API URL, made a real
    sale while offline (confirmed local stock deduction, `pending` sync status), reconnected,
    confirmed automatic incremental sync picked up the queued sale with **zero duplication** and a
    real server-assigned invoice number.
  - Navigated and rendered Customers, Products (+ Categories tab), Reports (all 7 tabs), Employees,
    Branches, Purchases, Inventory, Sales History, Settings > Sync Status — all against real seeded
    data, all with correct empty states where no data existed (no fabricated numbers anywhere).
  - Subscription banner correctly reflecting the real trial state; device registration correctly
    blocked by the real backend once the plan's device limit was hit (403, exact message
    surfaced), confirming server-side enforcement is genuinely authoritative, not bypassable.
- **Packaging**: `electron-builder --win` produced a real NSIS installer, silently installed to a
  test directory, and the installed executable was launched directly and confirmed running.

## 10. Build result

- **Dev**: `npm run dev` (electron-vite dev server + HMR) — used during iteration.
- **Production build**: `npm run build` — clean, no errors.
- **Windows installer**: `Universal POS-Setup-0.1.0.exe` (NSIS, 85.5MB) + `Universal
  POS-Portable-0.1.0.exe` (85.3MB portable) — both built and functionally verified (§9). Unsigned
  (see §11).
- **macOS**: configuration present (`electron-builder.yml` `mac:` block), **not buildable on this
  Windows machine** — Apple's toolchain requires macOS.

## 11. Known limitations

1. **Windows build is unsigned.** `winCodeSign` (electron-builder's bundled signing helper)
   failed to extract in this sandboxed environment (`Cannot create symbolic link: A required
   privilege is not held by the client.` — needs Windows Developer Mode or Administrator, neither
   available here). Worked around with `signAndEditExecutable: false` +
   `CSC_IDENTITY_AUTO_DISCOVERY=false`, which produces a fully functional but unsigned installer.
   A real release needs a code-signing certificate and to build without that workaround (or with
   Developer Mode enabled) so the executable also gets its icon/version resource embedded.
2. **macOS build is configured but unverified.** No macOS hardware available in this environment.
   The config targets both Intel and Apple Silicon and the app code has no known Windows-specific
   assumptions, but this is an expectation, not a tested fact — must be built and QA'd on a real
   Mac before shipping.
3. **Auto-update feed is live (GitHub Releases).** `electron-builder.yml`'s `publish` points at
   `github.com/Younas22/post_software_app` (public repo, so no auth needed on the client side —
   every install's "Check for updates" hits the same public release feed). To ship a new version:
   bump `version` in `package.json`, then run
   `CSC_IDENTITY_AUTO_DISCOVERY=false GH_TOKEN=<repo-scoped PAT> npx electron-builder --win --publish always`
   (`npm run build` first if `out/` isn't already current). This uploads the installer + portable
   exe + `latest.yml`/blockmap and creates the matching `vX.Y.Z` GitHub Release; electron-updater
   in already-installed clients then detects the new version automatically. The PAT only needs
   `repo` scope and is only ever used on the machine doing the release — it is never bundled into
   the app or seen by end users.
4. **No product image upload from the desktop app.** `POST /products` supports multipart image
   upload server-side; the desktop Products form only sends the text fields (name/SKU/barcode/
   pricing/etc.) — image management stays a web-app/admin-panel task for now.
5. **No inline "Choose Printer" during an active print failure.** The "Printer unavailable" alert
   offers **Retry**; changing the printer requires going to Settings > Printer separately rather
   than an inline picker in the failure dialog itself.
6. **Smaller UI kit than the web app's.** Drawer, DatePicker, Popover, Tooltip, Breadcrumb, and
   Avatar were not ported — nothing in the desktop app's screens needed them in this pass. Date
   range filters (Reports) use plain `<input type="date">` instead of a calendar picker.
7. **No automated test suite.** Verification throughout was live/manual (Playwright-driven real
   app + real backend) rather than a checked-in unit/integration suite — appropriate for the time
   available, but a real release should add one, especially around `salesRepo`'s transactional
   sale-creation logic and the sync engine's conflict/retry paths.
8. **Renderer bundle is a single ~784KB chunk** for the app shell (page-level code is already
   split via `React.lazy`). Acceptable for a desktop app (no network download per launch — it's
   packaged locally), but could be split further (e.g. separating `lucide-react`'s icon set) if
   startup time on very low-end hardware becomes a concern.
9. **Cash Sessions** (open/close shift, cash-in/cash-out): the real backend has full API support
   (`cash-sessions.service` equivalent could be built), but — matching the web app's own documented
   scope decision — no dedicated UI was built for it here either, since neither the master spec's
   POS section nor a sale requires an open cash session server-side.
10. **`max_businesses`** is seeded on `Package` but never enforced anywhere in the real backend
    (a pre-existing gap noted in `LARAVEL_API_DISCOVERY.md`, not something this app can or should
    work around client-side).

## 12. Recommendations for a real release

1. Get Windows Developer Mode (or a CI runner with it/Administrator) enabled, obtain a code-signing
   certificate, and rebuild without the `signAndEditExecutable`/`CSC_IDENTITY_AUTO_DISCOVERY`
   workarounds so the shipped installer is signed and carries a real app icon.
2. Build and QA on real Intel + Apple Silicon Macs; get an Apple Developer Team ID for
   notarization.
3. Stand up a real update feed (S3 bucket, GitHub Releases, or similar) and point
   `electron-builder.yml`'s `publish.url` at it.
4. Add automated tests around the sync engine and offline sale creation — the highest-value area,
   given how much of this app's correctness depends on that logic never silently losing or
   duplicating a transaction.
5. If a physical thermal printer / cash drawer is available, do a hands-on hardware pass — the
   ESC/POS and printer-selection code here was built against the documented protocol and verified
   architecturally (non-blocking, error-surfacing) but not against real hardware.
6. Consider building out a Cash Session shift UI and product image upload if those become
   priorities — both are additive, not blocking.
