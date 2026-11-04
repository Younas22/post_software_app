/**
 * Canonical list of every IPC channel the renderer is allowed to invoke.
 * The preload bridge (src/preload/index.ts) only exposes wrapper functions
 * for these — never a generic ipcRenderer.invoke passthrough — and the main
 * process (src/main/ipc/registerIpc.ts) only registers handlers for exactly
 * this list. Adding a new renderer capability means adding it here AND in
 * both preload + main; there is no other route into the main process.
 */
export const IpcChannels = {
  // Window controls
  WindowMinimize: 'window:minimize',
  WindowMaximize: 'window:maximize',
  WindowUnmaximize: 'window:unmaximize',
  WindowClose: 'window:close',
  WindowIsMaximized: 'window:is-maximized',
  WindowOnMaximizeChange: 'window:on-maximize-change',
  /** Sets the window/taskbar icon to the business's favicon (a data: URI). */
  WindowSetIcon: 'window:set-icon',

  // App/system
  AppGetVersion: 'app:get-version',
  AppGetPlatform: 'app:get-platform',
  SystemOnlineStatus: 'system:online-status',
  SystemOnOnlineStatusChange: 'system:on-online-status-change',

  // Auth (user, Sanctum token — Phase 03)
  AuthLogin: 'auth:login',
  AuthLogout: 'auth:logout',
  AuthRestoreSession: 'auth:restore-session',
  AuthGetSession: 'auth:get-session',
  AuthRefreshUser: 'auth:refresh-user',

  // Cached business/branch/features context (Phase 03/05)
  ContextGet: 'context:get',
  ContextRefreshBusiness: 'context:refresh-business',

  // Device registration (Phase 03)
  DeviceGetStatus: 'device:get-status',
  DeviceSuggestedName: 'device:suggested-name',
  DeviceRegister: 'device:register',
  DeviceForget: 'device:forget',
  DeviceValidate: 'device:validate',

  // Sync engine (Phase 05/06)
  SyncRunInitial: 'sync:run-initial',
  SyncRunIncremental: 'sync:run-incremental',
  SyncGetStatus: 'sync:get-status',
  SyncOnProgress: 'sync:on-progress',
  SyncOnStatusChange: 'sync:on-status-change',
  SyncRetryFailed: 'sync:retry-failed',
  SyncGetQueue: 'sync:get-queue',
  SyncGetConflicts: 'sync:get-conflicts',
  SyncResolveConflict: 'sync:resolve-conflict',

  // Local catalog reads (SQLite — Phase 04/07)
  CatalogSearchProducts: 'catalog:search-products',
  CatalogGetProductByBarcode: 'catalog:get-product-by-barcode',
  CatalogListCategories: 'catalog:list-categories',
  CatalogListCustomers: 'catalog:list-customers',
  CatalogSearchCustomers: 'catalog:search-customers',
  CatalogListPaymentMethods: 'catalog:list-payment-methods',
  CatalogUpsertLocalProduct: 'catalog:upsert-local-product',
  CatalogGetTaxSettings: 'catalog:get-tax-settings',

  // Offline-first POS sales (Phase 07)
  SalesCreate: 'sales:create',
  SalesList: 'sales:list',
  SalesGet: 'sales:get',
  SalesGetReceipt: 'sales:get-receipt',

  // Inventory (local cache)
  InventoryGetForBranch: 'inventory:get-for-branch',
  InventoryLowStock: 'inventory:low-stock',

  // Generic authenticated REST passthrough for online-only management
  // screens (Products CRUD, Purchases, Expenses, Employees, Branches,
  // Reports, Subscription, ...). The renderer never holds the bearer token
  // or talks to the network directly — it only asks main to make one
  // specific, whitelisted call. See src/main/api/remoteGateway.ts.
  RemoteRequest: 'remote:request',
  /** Multipart upload to a short allow-list (profile photo, business logo/favicon). */
  RemoteUpload: 'remote:upload',
  /** Downloads a server image (same origin as the API only) as a CSP-safe data: URI. */
  MediaFetchImage: 'media:fetch-image',

  // Printing / hardware (Phase 09/10)
  PrinterList: 'printer:list',
  PrinterGetDefault: 'printer:get-default',
  PrinterSetDefault: 'printer:set-default',
  PrinterPrintReceipt: 'printer:print-receipt',
  PrinterOpenCashDrawer: 'printer:open-cash-drawer',

  // Settings (local, non-sensitive key/value)
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsGetAll: 'settings:get-all',

  // Auto-update (Phase 13)
  UpdaterCheck: 'updater:check',
  UpdaterDownload: 'updater:download',
  UpdaterQuitAndInstall: 'updater:quit-and-install',
  UpdaterOnEvent: 'updater:on-event',

  // Logs
  LogsGetRecent: 'logs:get-recent',
  LogsOpenFolder: 'logs:open-folder'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
