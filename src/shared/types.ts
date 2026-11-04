/**
 * Shared domain types used by main, preload and renderer. Field names
 * mirror the real Laravel API contract documented in
 * post_software_web/docs/LARAVEL_API_DISCOVERY.md and
 * ELECTRON_DESKTOP_APP_HANDOFF.md — nothing here is invented.
 */

export interface ApiSuccessEnvelope<T> {
  success: true
  message: string
  data: T
  meta?: PaginationMeta
}

export interface ApiErrorEnvelope {
  success: false
  message: string
  errors: Record<string, string[]>
  error_type?: 'retryable' | 'non_retryable' | 'conflict'
  status?: number
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope

export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number | null
  to: number | null
}

export interface AuthUser {
  id: number
  name: string
  email: string
  /** Absolute URL of the profile photo on the server (null → initials). */
  avatar_url?: string | null
  is_super_admin: boolean
  status: 'active' | 'inactive'
  client_id: number | null
  business_id: number | null
  branch_id: number | null
  roles: string[]
  permissions: string[]
}

export interface Session {
  user: AuthUser
  // Never sent to the renderer — main process only. The renderer only ever
  // learns whether a session exists, not the token itself.
}

export interface PublicSessionInfo {
  isAuthenticated: boolean
  user: AuthUser | null
}

export type DevicePlatform = 'windows' | 'mac' | 'linux' | 'web' | 'android' | 'ios'

export interface DeviceRecord {
  id: number
  name: string
  platform: DevicePlatform
  device_identifier: string
  status: 'active' | 'inactive' | 'blocked'
  client_id: number
  business_id: number
  branch_id: number
  activated_at: string | null
  last_seen_at: string | null
}

export interface DeviceStatus {
  isRegistered: boolean
  device: DeviceRecord | null
}

export interface BusinessInfo {
  id: number
  name: string
  currency: string
  timezone: string
  /** Absolute URL of the business logo on the server (null = no logo). */
  logo_url?: string | null
  /** Locally cached copy of the logo as a data: URI — shown offline, and CSP-safe. */
  logo_data?: string | null
  /** Absolute URL of the business's own browser-tab/app icon (null → logo is used). */
  favicon_url?: string | null
}

/* ───────────── Business-type branding (Admin → Business Types) ───────────── */

/** What a trade calls things — "Patient" instead of "Customer", "Menu" instead of "Products", ... */
export interface Terminology {
  customer: string
  customers: string
  product: string
  products: string
  sale: string
  sales: string
  supplier: string
  suppliers: string
  purchase: string
  purchases: string
  category: string
  categories: string
  inventory: string
  pos: string
}

export type SidebarStyle = 'light' | 'dark' | 'brand'
export type HideableModule = 'inventory' | 'purchases' | 'suppliers' | 'returns' | 'expenses'
export type OptionalModule = 'installments'

export interface BrandTheme {
  primary_color: string
  sidebar_style: SidebarStyle
  login_headline: string
  login_tagline: string
  login_highlights: string[]
  login_image_url: string | null
}

/** GET /config → business_type: colours, terminology and module switches for this trade. */
export interface BusinessTypeBranding {
  id: number
  name: string
  slug: string
  icon: string | null
  description: string | null
  theme: BrandTheme
  terminology: Terminology
  modules: { hidden: HideableModule[]; enabled: OptionalModule[] }
}

/** GET /public/platform — the POS company's own profile & support contacts. */
export interface PlatformInfo {
  name: string
  logo_url: string | null
  favicon_url: string | null
  office_address: string | null
  support_email: string | null
  support_phone: string | null
  support_whatsapp: string | null
  live_chat_url: string | null
  support_hours: string | null
  website: string | null
}

export interface BranchInfo {
  id: number
  name: string
  address: string | null
  phone: string | null
  is_main?: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  status: string
  updated_at: string
}

export interface Product {
  id: number
  category_id: number | null
  brand_id: number | null
  name: string
  sku: string
  barcode: string | null
  sale_price: number
  purchase_price: number
  tax_rate: number | null
  unit: string
  minimum_stock: number
  status: string
  image: string | null
  updated_at: string
  // Local-only, joined from the inventory cache for the active branch.
  stock_quantity?: number
}

export interface Customer {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  status: string
  updated_at: string
}

export interface PaymentMethod {
  id: number
  name: string
  slug: string
}

export interface CartItemInput {
  product_id: number
  quantity: number
  discount?: number
}

export interface PaymentInput {
  payment_method_id: number
  amount: number
  reference?: string
}

export interface CreateSaleInput {
  branch_id: number
  customer_id?: number | null
  items: CartItemInput[]
  payments: PaymentInput[]
  client_transaction_id: string
}

export type SaleSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict'

export interface LocalSale {
  local_id: string
  server_id: number | null
  invoice_number: string | null
  client_transaction_id: string
  branch_id: number
  customer_id: number | null
  cashier_id: number
  items: Array<{
    product_id: number
    product_name: string
    quantity: number
    unit_price: number
    discount: number
    tax: number
    line_total: number
  }>
  payments: PaymentInput[]
  subtotal: number
  discount: number
  tax: number
  total: number
  sync_status: SaleSyncStatus
  sale_date: string
  created_at: string
}

export interface Receipt {
  invoice_number: string
  business?: { name: string; address?: string | null; logo_data?: string | null; timezone?: string | null }
  branch: { name: string; address?: string | null; phone?: string | null }
  cashier: { name: string }
  customer: { name: string } | null
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    discount: number
    tax: number
    line_total: number
  }>
  subtotal: number
  discount: number
  tax: number
  total: number
  payments: PaymentInput[]
  sale_date: string
  is_offline?: boolean
}

export type OnlineStatus = 'online' | 'offline' | 'connecting'
export type SyncPhase = 'idle' | 'preparing' | 'categories' | 'products' | 'customers' | 'inventory' | 'sales' | 'finalizing' | 'ready' | 'error'

export interface SyncProgressEvent {
  phase: SyncPhase
  message: string
  current?: number
  total?: number
}

export interface SyncStatusSummary {
  lastFullSyncAt: string | null
  lastIncrementalSyncAt: string | null
  pendingCount: number
  syncedCount: number
  failedCount: number
  conflictCount: number
  isSyncing: boolean
  online: OnlineStatus
}

export interface SyncQueueItem {
  operation_id: string
  entity: 'sale'
  action: 'create'
  local_id: string
  payload: string
  created_at: string
  status: SaleSyncStatus
  attempts: number
  last_error: string | null
}

export interface RemoteRequestPayload {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

/** A multipart upload (profile photo, business logo/favicon) sent through main — see remoteGateway.handleRemoteUpload. */
export interface RemoteUploadPayload {
  path: string
  /** Plain form fields (sent as strings). */
  fields?: Record<string, string>
  files: Array<{ field: string; name: string; type: string; data: ArrayBuffer }>
}

export interface RemoteResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  message?: string
  errors?: Record<string, string[]>
  meta?: PaginationMeta
}

export interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
}

export type PaperSize = '58mm' | '80mm' | 'A4'
export type PrinterConnection = 'system' | 'network'

export interface PrinterConfig {
  connection: PrinterConnection
  systemPrinterName: string | null
  networkHost: string | null
  networkPort: number
  paperSize: PaperSize
  openCashDrawerAfterSale: boolean
}

export type UpdaterEventType =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error'

export interface UpdaterEvent {
  type: UpdaterEventType
  version?: string
  percent?: number
  message?: string
}

export interface AppLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  scope: string
  message: string
}
