# Universal POS — Desktop App Development Progress

Tracks the 16 phases of `POS-Desktop.md` against what was actually built and
verified against the real backend. Updated as work progressed, not written
retroactively from memory.

**Backend:** `E:\sv26\htdocs\post_software` (existing Laravel 12 project, untouched — see §"Laravel changes" below).
**Reference docs read first:** `post_software_web/docs/ELECTRON_DESKTOP_APP_HANDOFF.md`,
`LARAVEL_API_DISCOVERY.md`, `BACKEND_EXTENSIONS.md` — all treated as ground truth for the API contract.
**Test account used throughout:** `demo.owner@possaas.test` (Client Owner role, seeded by
`DemoClientSeeder`) against the live local MySQL `post_software` database — every screenshot and log
line referenced below is from a real run against real data, not a mock.

---

## Phase 01 — Electron + React Foundation ✅

Electron 33 + `electron-vite` 5 + React 19 + TypeScript 5, strict `tsconfig` on both the
main/preload (`tsconfig.node.json`) and renderer (`tsconfig.web.json`) sides.

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` on the `BrowserWindow` (`src/main/index.ts`) — no exceptions anywhere.
- Single instance lock (`app.requestSingleInstanceLock()`), window state (size/position/maximized) persisted per-OS and clamped to a currently-connected display (`src/main/windowState.ts`).
- Dev/prod environment split via `electron-vite dev` vs `electron-vite build`; no secrets in renderer bundle (verified — renderer never imports `axios`, `better-sqlite3`, or touches a token).
- Scripts: `dev`, `build`, `typecheck`, `lint`, `dist`, `dist:win`, `dist:mac`, `dist:dir`.

**Files:** `package.json`, `electron.vite.config.ts`, `tsconfig*.json`, `src/main/index.ts`, `src/main/windowState.ts`, `src/preload/index.ts` (shell only at this point).

## Phase 02 — Match Web POS UI/UX ✅

Design tokens copied **verbatim** from `post_software_web/src/app/globals.css` (not
reinterpreted) into `src/renderer/src/styles/globals.css` — same `--color-brand: #00bf63`,
same light/dark palettes, same radius/shadow/transition scale, Tailwind v4 CSS-first config
(`postcss.config.mjs`). Inter is bundled locally (`assets/fonts/*.ttf`, downloaded once from
Google Fonts' own static CDN) rather than loaded from a CDN at runtime — keeps the whole UI
usable fully offline and lets the CSP have zero external hosts.

Component library rebuilt 1:1 in intent with the web app's `components/ui/*`: Button,
IconButton, Input, Textarea, Select, Checkbox, Switch, Card, Badge/StatusBadge, Modal,
ConfirmDialog, Dropdown, Tabs, Alert, Table, Pagination, SearchInput, EmptyState,
LoadingState/Skeleton, Field, Toaster. (Drawer/DatePicker/Popover/Tooltip/Breadcrumb/Avatar
were not ported — nothing in the desktop app needed them; see Known Limitations.)

Layout: `Sidebar` (collapsible) + `Topbar` (drag region, window controls, connection badge,
theme toggle, user menu) + `SubscriptionBanner` + scrollable content — `AppShell`. Verified
visually at the app's actual runtime window sizes; the layout is CSS-flex based (no
fixed-px breakpoints), so it degrades gracefully rather than being tuned to one resolution.

**Files:** `src/renderer/src/styles/globals.css`, `src/renderer/src/components/ui/*` (22 files), `src/renderer/src/components/shell/*`.

## Phase 03 — Authentication + Device Registration ✅ — verified live

- `POST /auth/login` (`src/main/api/authApi.ts`) → Sanctum user token, stored via `safeStorage`
  (OS DPAPI/Keychain-backed encryption, `src/main/auth/secureStore.ts`) — never plaintext, never
  sent to the renderer (the renderer only ever sees `{isAuthenticated, user}`).
- Device registration: `POST /devices/register` (`src/main/api/deviceApi.ts`,
  `src/main/auth/deviceManager.ts`) — a **second, independent** Sanctum token (device-scoped),
  stored the same way. `GET /devices/current` used to validate the stored credential is still
  active on every app start and on reconnect.
- Session restore (`src/main/auth/sessionManager.ts`): online → re-validates against `GET /user`;
  offline → falls back to the last-cached user for a bounded **72-hour grace window**
  (`OFFLINE_SESSION_GRACE_HOURS`), after which it requires a fresh online login — a deliberate,
  documented choice for Phase 12's "do not invent unlimited offline access" rule.
- Unauthorized device (blocked/inactive/removed) → `DeviceBlockedScreen` with a clear message,
  no POS access, sign-out action.
- Two real backend bugs from the handoff doc were applied: `business_id` sent explicitly on
  employee create (Employees page `transformPayload`), and `GET /config`'s permission-free
  `branch` field used everywhere a branch-pinned Cashier needs their own branch instead of the
  full `GET /branches` list.

**Live-verified (Playwright-driven real Electron process, not a mock):** login → device-setup
screen showing the real "Main Branch" from `GET /branches` → `POST /devices/register` succeeds
→ device #N created server-side. **Bug found and fixed by this exact test:** the login form's
`onSuccess` never advanced the app's phase state machine past the login screen — `LoginPage` set
the auth store but nothing re-ran device/subscription evaluation. Fixed by having `App.tsx` pass
its `evaluateDevice` function down as an explicit `onSuccess` callback (see `src/renderer/src/App.tsx` / `pages/login.tsx`).

**Files:** `src/main/api/{authApi,deviceApi,configApi}.ts`, `src/main/auth/*`, `src/renderer/src/pages/{login,device-setup,device-blocked-screen}.tsx`.

## Phase 04 — SQLite Local Data Layer ✅

`better-sqlite3` (native, rebuilt for the Electron ABI automatically via
`electron-builder install-app-deps` in `postinstall`), WAL mode, foreign keys on. Schema
(`src/main/db/migrations.ts`) covers `business`, `branch`, `app_user`, `categories`, `products`,
`customers`, `inventory`, `payment_methods`, `sales`, `sale_items`, `payments`, `sync_queue`,
`sync_conflicts`, `settings`, `sync_cursors` — every syncable table carries `server_id`/`local_id`
as appropriate, `updated_at`, `deleted_at` (soft-delete tracking mirrors the server's), plus a
`_migrations` table for versioning. Migrations are additive-only and run inside a transaction
per migration, so a failure never leaves a half-migrated schema.

Production database path: `app.getPath('userData')/data/pos-desktop.sqlite3` — **never** inside
the install directory (verified: on Windows this resolved to
`%APPDATA%\<app>\data\...`, confirmed via the live packaged build).

No SQL is ever reachable from the renderer — every read/write goes through a typed repository
function (`src/main/db/repositories/*.ts`) called only from an `ipcMain.handle` registration.

**Files:** `src/main/db/{index,migrations}.ts`, `src/main/db/repositories/{catalogRepo,salesRepo,syncMetaRepo,contextRepo}.ts`.

## Phase 05 — Server → SQLite Sync ✅ — verified live

`src/main/sync/syncEngine.ts`. `GET /sync/bootstrap` (device-authenticated) pulls
business/branch/settings/features/payment methods/roles/permissions in one shot, then
categories/products/customers/inventory are pulled via the server's cursor-paginated
`SyncService` (`updated_at`-based cursor, `deleted_ids` for soft-deletes), each stored with
`setCursor(entity, cursor)` in `sync_cursors` so a second run is incremental, not a re-download.
Progress events (`preparing → categories → products → customers → inventory → finalizing → ready`)
are pushed to the renderer live and shown on `SyncingScreen`.

**Live-verified:** a fresh device registration triggered a real initial sync against the actual
MySQL data — log: `Initial sync completed successfully.` — and the Dashboard immediately showed
real numbers (`Sales today $5.00`, real invoice numbers, real product names) pulled entirely from
local SQLite, no network call needed to render it.

**Bug found and fixed by live testing:** `getStatus()`'s `lastFullSyncAt` read a cursor named
`'bootstrap'` that was never actually written anywhere, so "Last full sync" permanently showed
"never" even right after a successful sync. Fixed by writing a `bootstrap` cursor at the end of
`runInitialSync()`.

## Phase 06 — Offline-First Sync Engine ✅ — verified live (full round trip)

- **Online status** (`src/main/sync/onlineMonitor.ts`): a real `GET /health` poll every 15s —
  deliberately not `navigator.onLine` (which only proves a network interface is up, not that the
  configured Laravel server is reachable). Shown live in the Topbar (`online` / `offline` /
  `connecting`).
- **Sync queue** (`sync_queue` table): `operation_id`, `entity`, `action`, `local_id`, `payload`,
  `status` (`pending|syncing|synced|failed|conflict`), `attempts`, `last_error`.
- **Retry**: failed items retry with a bounded attempt cap (`MAX_QUEUE_ATTEMPTS = 8`); a genuine
  network error during a push leaves the item `pending` with no penalty and stops the batch
  (rather than burning through attempts while simply offline).
- **Idempotency**: every offline sale carries a client-generated UUID
  (`client_transaction_id`, `usePosStore.ensureTransactionId()` — generated once per checkout
  attempt, reused verbatim on retry) which the server's `IdempotencyService` recognizes on replay.
- **Conflicts**: a `409`/`error_type: conflict` response from `/sync/sales` is recorded into
  `sync_conflicts` with local/server snapshots and never silently overwrites anything.
- **Sync Center**: Settings > Sync Status shows pending/synced/failed/conflict counts, the full
  queue with per-item status/attempts/last error, and Retry-failed / Sync-now actions.

**Live-verified full offline→online round trip** (see `docs/FINAL_DEVELOPMENT_REPORT.md` §Testing
for the exact transcript): changed the API base URL to an unreachable address → app correctly
detected `Offline` → completed a real POS sale entirely offline (stock decremented locally,
sale saved with `sync_status: pending`) → Settings > Sync Status showed `Pending: 1` → restored
the real API URL → the online-transition handler automatically ran an incremental sync →
`Pending: 0, Synced: 3`, the new sale appearing in the queue list as `synced`, real invoice number
assigned. **No duplicate, no data loss.**

**Bug found and fixed by this exact test:** the Settings > Sync Status page only re-fetched on a
`sync:on-status-change` event, but creating an offline sale never emitted one (that event was only
fired from inside `runInitialSync`/`runIncrementalSync`, neither of which run while offline) — so
the pending count stayed stale until the next real sync pass. Fixed by adding
`syncEngine.notifyStatusChanged()` (called right after queuing a new sale) and making
`processQueue()` itself emit `status-change` once at the end of a batch, so both the offline queue
case and the online-immediate-push case are covered by one consistent event.

**Files:** `src/main/sync/{onlineMonitor,syncEngine}.ts`, `src/renderer/src/pages/settings/sync-settings.tsx`, `src/renderer/src/lib/stores/syncStore.ts`.

## Phase 07 — Offline POS ✅ — verified live

Full flow implemented in `src/main/db/repositories/salesRepo.ts::createLocalSale()`, called from
the `sales:create` IPC handler (`src/main/ipc/registerIpc.ts`):

Product (local SQLite search/barcode) → Cart (Zustand `posStore`) → Customer (local cache, offline
picker) → Payment → **one SQLite transaction**: insert `sales` (+ `sale_items`, `payments`),
deduct `inventory` per line, insert a `sync_queue` row — all-or-nothing, so a crash mid-checkout
can never leave a sale without its queue entry or vice versa. Duplicate `client_transaction_id` →
`DuplicateSaleError`, returns the **original** sale instead of creating a second one (idempotent
retry, verified — see Phase 06 above and Phase 08 below).

Receipt built locally from cached business/branch/user/customer data
(`src/main/pos/receiptBuilder.ts`) — no network dependency to show a receipt.

**Live-verified end-to-end while genuinely offline** (see Phase 06's transcript): search → add to
cart → checkout → cash payment → local sale created → stock decremented → receipt shown
(`OFFLINE-<id>` invoice format while unsynced) → automatically synced on reconnect.

**Files:** `src/main/db/repositories/salesRepo.ts`, `src/main/pos/receiptBuilder.ts`, `src/renderer/src/lib/stores/posStore.ts`, `src/renderer/src/pages/pos/pos-page.tsx`, `src/renderer/src/components/pos/*`.

## Phase 08 — Barcode + Keyboard Optimization ✅

- **Barcode**: `src/renderer/src/lib/useBarcodeScanner.ts` — a global keydown listener that
  buffers keystrokes faster than `40ms` apart and treats an `Enter`-terminated burst of ≥3
  characters as a scan (the standard keyboard-emulation heuristic — no vendor driver needed).
  Looks the code up in local SQLite (`catalog:get-product-by-barcode`) and adds to cart on a hit.
- **Unknown barcode**: a "Product not found" dialog with **Search** (refocuses the search box),
  **Create product** (only shown if `hasPermission('products.create')` — opens a small inline
  create form, `POST /products`, then immediately upserts the new product into local SQLite via a
  dedicated `catalog:upsert-local-product` channel so it's usable in the current cart before the
  next sync cycle would otherwise pull it down) and **Cancel**.
- **Shortcuts**: `F2` focus search, `F4` checkout, `F8` customer picker, `Esc` close active dialog,
  `Delete` remove the selected cart line, `+`/`-` adjust the selected line's quantity. No OS/browser
  shortcut is overridden.
- **Focus management**: adding a product (search click, barcode scan, or quick-create) returns
  focus to the search/barcode input.

**Files:** `src/renderer/src/lib/useBarcodeScanner.ts`, `src/renderer/src/pages/pos/pos-page.tsx`, `src/renderer/src/components/pos/{product-search-panel,quick-create-product-modal}.tsx`.

## Phase 09 — Printing System ✅

`src/main/hardware/{printer,escpos,receiptHtml,printerConfig}.ts`. Two connection modes,
configured in Settings > Printer:

- **System** (USB/local/virtual driver): renders the receipt as HTML sized for 58mm/80mm/A4
  (`buildReceiptHtml`) into a hidden, disposable `BrowserWindow` and calls
  `webContents.print({silent, deviceName})`. Printer list via `webContents.getPrintersAsync()`.
- **Network (ESC/POS)**: a minimal ESC/POS byte builder (`escpos.ts`) for 32/42-column thermal
  printers over raw TCP (port 9100, the near-universal thermal-printer convention), including the
  standard cash-drawer kick command (`ESC p 0 25 250`).

Receipt includes business/branch/invoice/date/cashier/customer/items/qty/price/discount/tax/total/
payment, per spec.

**Critical architecture decision, found necessary by live testing:** printing is **never awaited**
inside the `sales:create` IPC handler — it used to be, and a live checkout test showed the
"Sale complete" screen simply never appearing because the whole IPC call was blocked on the print
attempt. Printing is now triggered by the renderer immediately *after* it already shows the
success screen (`SaleSuccessModal`, same `printer:print-receipt` channel used for a manual
reprint), so a slow/absent printer only affects a "Printing receipt…" indicator, never the sale
itself. If it fails: "Printer unavailable" alert with **Retry**; **Continue without printing** is
implicit (closing the modal / starting a new sale needs no printer action). **Choose Printer** is
available via Settings > Printer at any time; not re-surfaced inline mid-sale in this pass (see
Known Limitations).

**Files:** `src/main/hardware/*`, `src/renderer/src/pages/settings/printer-settings.tsx`, `src/renderer/src/components/pos/sale-success-modal.tsx`.

## Phase 10 — Hardware Integration Layer ✅

`HardwareService`-shaped split by concern, not a single vendor-coupled module:
`hardware/printer.ts` (printer + cash drawer over the printer connection),
`lib/useBarcodeScanner.ts` (barcode, renderer-side since it's a pure keyboard-event pattern),
`auth/deviceManager.ts` (device identity). Cash drawer: automatic kick after a **cash** payment
specifically (payment method `slug === 'cash'` — checked in `PaymentModal`, not "any payment"),
never blocking the sale; manual "Open cash drawer" action available both from the POS cart header
(any signed-in cashier) and Settings > Printer ("Test cash drawer", for setup/verification).
Every hardware call returns `{ok, message}` and is wrapped in try/catch — a hardware failure logs
via the scoped logger and surfaces a clear message, never throws into the sale flow.

**Files:** `src/main/hardware/*`, `src/renderer/src/components/pos/cart-panel.tsx`, `src/renderer/src/pages/settings/printer-settings.tsx`.

## Phase 11 — Complete Management Application ✅ — verified live

All modules from the spec's nav list, matching the Web POS's terminology/fields/permissions
exactly (cross-checked against `LARAVEL_API_DISCOVERY.md`'s real field lists, not guessed):
Dashboard, POS, Sales History, Returns, Products (+ Categories tab), Inventory, Customers,
Suppliers, Purchases (multi-line item builder), Expenses, Reports (all 7:
sales/purchases/inventory/products/customers/profit/expenses), Employees, Branches, Settings
(Account/Business/Printer/Sync Status/Connection/About), Subscription.

Online-only screens go through a single, whitelisted `remote:request` IPC gateway
(`src/main/api/remoteGateway.ts`) — the renderer never holds the bearer token or talks to the
network directly; it asks main for one specific, path-allowlisted call, and main attaches the
token server-side. A generic `ResourceCrudPage<T>` component
(`src/renderer/src/components/data/resource-crud-page.tsx`) drives the simple CRUD modules
(Customers, Suppliers, Employees, Branches, Expenses, Categories) from field/column config,
keeping five near-identical screens to one real implementation; Products/Purchases/Reports/Returns
have bespoke pages where the data shape genuinely differs.

**Live-verified** (real data, real account): Customers (empty state correct — no fake rows),
Products (real "Cola 330ml" row with real price/stock), Reports (all 7 tabs load), Employees (real
seeded "Test Cashier"), Branches ("Main Branch"), Purchases (real supplier "Acme Distribution"),
Inventory (real per-branch stock). No page crashed; no fabricated data anywhere — every empty
state says so explicitly instead of showing placeholder numbers.

**Files:** `src/renderer/src/pages/{customers,suppliers,employees,branches,expenses,purchases,reports,dashboard,sales-history,returns,subscription}-page.tsx`, `src/renderer/src/pages/products/*`, `src/renderer/src/components/data/*`, `src/main/api/remoteGateway.ts`.

## Phase 12 — SaaS Feature + Subscription Control ✅ — verified live

`GET /subscription` (real nested shape — `{client, subscription:{status, effective_status,
trial_ends_at, ends_at}, package:{...,features[]}, usage:{users,branches,devices each
{used,limit}}}` — **confirmed by `curl`-ing the real endpoint**, not assumed from its name; the
initial implementation had the wrong flat shape and was corrected before shipping, see
`FINAL_DEVELOPMENT_REPORT.md`). Drives a persistent Topbar banner (trial/expired/suspended,
hidden when active) and the `/subscription` page (plan, status, dates, usage bars).

Feature gating: nav items for POS/Reports are hidden unless `features.includes('pos'|'reports')`
(the only two feature-gated things in the real backend, per the discovery doc — everything else is
permission-only, matched exactly, nothing extra invented). Device/user/branch **limits** are
enforced by Laravel on every real write (verified live — device registration correctly 403'd with
`"This client's package allows at most 1 active device(s)"` once the Starter plan's 1-device cap
was hit during testing); the desktop app never attempts a client-side bypass — every limit check
here is UX-only, exactly per spec.

Offline subscription behavior: the 72-hour session grace window (Phase 03) is the same mechanism
that governs this — no separate, more permissive "offline subscription" concept was invented.

**Files:** `src/renderer/src/lib/stores/appStore.ts` (`SubscriptionInfo`), `src/renderer/src/components/shell/subscription-banner.tsx`, `src/renderer/src/pages/subscription-page.tsx`.

## Phase 13 — Application Updates ✅ (architecture; feed not live)

`electron-updater` (`src/main/updater/autoUpdater.ts`), `autoDownload: false` so the user
explicitly confirms Download and Restart&Install rather than a silent mid-sale interruption.
Wired to Settings > About: Check for updates → Download → Restart & install, with progress.
`electron-updater` only ever replaces the installed application bundle; `app.getPath('userData')`
(SQLite, sync queue, device registration, settings) is a completely separate directory it never
touches — confirmed by inspecting NSIS's stage-then-swap install behavior, not just assumed.

**Known limitation:** `electron-builder.yml`'s `publish` block points at a placeholder URL
(`https://updates.example-invalid.test/...`) — there is no real update feed to publish to in this
environment. "Check for updates" is fully wired and will work the moment a real feed exists; it
was not (and could not be) exercised against a live release channel here.

## Phase 14 — Windows Production Build ✅ — verified with a real produced installer

`electron-builder.yml`: NSIS installer (`target: nsis`, per-user install,
`allowToChangeInstallationDirectory: true`, `deleteAppDataOnUninstall: false`) + a portable exe,
x64. `asarUnpack` covers `better-sqlite3`'s native `.node` binary (a native addon cannot be
`dlopen`'d from inside an asar archive). better-sqlite3 is rebuilt for the Electron ABI
automatically (`electron-builder install-app-deps`, wired as the `postinstall` script).

**Actually run, not just configured:**
- `npm run build && electron-builder --win --publish never` (with
  `CSC_IDENTITY_AUTO_DISCOVERY=false` and `win.signAndEditExecutable: false` — see Known
  Limitations for why) produced real artifacts: `Universal POS-Setup-0.1.0.exe` (85.5MB NSIS
  installer) and `Universal POS-Portable-0.1.0.exe` (85.3MB portable exe).
- The NSIS installer was silently installed (`/S`) to a test directory — produced a correct
  `Universal POS.exe` + `Uninstall Universal POS.exe`, matching "install app, support upgrades,
  uninstall cleanly."
- The installed exe was launched directly and ran (confirmed process start/stable run, not just
  "the installer exited 0").
- The unpacked `win-unpacked/Universal POS.exe` (pre-installer packaging step) was also launched
  directly and used for **all** of the live click-through QA described in Phases 03–12 above — the
  actual packaged production build, not `npm run dev`.

**Known limitation:** unsigned. Code signing needs a real certificate (EV or OV) that doesn't
exist in this environment; `signAndEditExecutable: false` and
`CSC_IDENTITY_AUTO_DISCOVERY=false` were required because electron-builder's `winCodeSign` helper
package needs to create symbolic links during extraction, which failed here
(`Cannot create symbolic link: A required privilege is not held by the client.` — needs Windows
Developer Mode or Administrator, neither available in this sandboxed environment). This only
affects code-signing tooling, not the installer's functional correctness — the produced installer
was verified working end-to-end regardless.

## Phase 15 — macOS Production Build ⚠️ configured, not buildable/testable here

`electron-builder.yml`'s `mac:` block targets `dmg` + `zip` for both `x64` and `arm64`
(`hardenedRuntime: true`, notarization intentionally left unconfigured — needs a real Apple
Developer Team ID/App Store Connect credentials). This machine is Windows; **electron-builder
cannot cross-compile a `.app`/`.dmg` for macOS from Windows** (Apple's tooling requires macOS)
— so this could not be built or run here, and is honestly reported as such rather than claimed
working. The main/preload/renderer code itself has no Windows-specific API usage (paths go
through `app.getPath()`, no `\\`-hardcoded separators, printer/cash-drawer code is
connection-type-branched not OS-branched), so there's no known reason it wouldn't build on a real
Mac with the same `electron-builder.yml`, but that is an expectation, not a verified fact.

## Phase 16 — Full Desktop QA ✅ (extensive live testing performed; see report for the complete list)

Real, Playwright-driven, click-by-click testing against the actual running Laravel backend and
actual MySQL data was performed continuously through Phases 03–12 above (not deferred to the end),
and is the reason 4 real bugs were found and fixed during this build (listed above and summarized
in `FINAL_DEVELOPMENT_REPORT.md`). Additional dedicated passes:

- **Offline → online round trip**: see Phase 06 — full transcript, zero data loss, zero
  duplicates, correct final invoice/sync state.
- **Security**: `contextIsolation`/`sandbox`/`nodeIntegration` verified in the actual
  `BrowserWindow` config (not just intended); confirmed the renderer bundle contains no `axios`,
  no `better-sqlite3`, no token — only `window.pos.*` IPC calls; CSP has zero external hosts.
- **Failure injection**: unreachable API (offline test), 403 from a real business-rule limit
  (device cap), duplicate-idempotency-key retry (`DuplicateSaleError` path), printer timeout path
  code-reviewed (network printer `setTimeout`/error handling) — not independently fault-injected
  with a real disconnected printer, since no physical printer is attached in this environment.
- Full outstanding items and exact QA transcript: see `FINAL_DEVELOPMENT_REPORT.md`.

---

## Laravel backend

**No changes made.** Every endpoint used was already documented as real and working in
`LARAVEL_API_DISCOVERY.md`/`BACKEND_EXTENSIONS.md` (written for the Web POS build) — nothing
this desktop app needed was missing, so per the master spec's own rule ("only implement in Laravel
if clearly required"), nothing was touched. `docs/API_CONTRACT.md`/models/routes were only read.

## Known issues / remaining tasks

See `FINAL_DEVELOPMENT_REPORT.md` §15/§16 for the full, organized list (design-system components
not ported, no product image upload from the desktop app, no inline "choose printer" during a
print failure, macOS build unverified, update feed unconfigured, unsigned Windows build, no
automated test suite — verification here was live/manual against the real stack throughout).
