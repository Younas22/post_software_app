/**
 * Hand-written mirror of the shape exposed by src/preload/index.ts on
 * `window.pos`. Kept as a plain, dependency-free interface (no `electron`
 * imports) so both the main-process preload build AND the renderer's
 * browser-only TypeScript project can reference the exact same contract
 * without pulling Node/Electron types into the renderer's compilation.
 * The preload script asserts its literal object against this type, so any
 * drift between the two is a compile error there, not a silent mismatch
 * here.
 */
import type {
  BranchInfo,
  BusinessInfo,
  CreateSaleInput,
  Customer,
  DeviceStatus,
  LocalSale,
  OnlineStatus,
  Product,
  PrinterConfig,
  PublicSessionInfo,
  Receipt,
  RemoteRequestPayload,
  RemoteResponse,
  RemoteUploadPayload,
  BusinessTypeBranding,
  SyncProgressEvent,
  SyncQueueItem,
  SyncStatusSummary,
  UpdaterEvent,
  Category,
  PaymentMethod,
  PrinterInfo
} from './types'

/** Mirrors src/main/db/repositories/syncMetaRepo.ts's ConflictRow shape. */
export interface ConflictRow {
  id: number
  entity: string
  local_id: string | null
  server_id: number | null
  reason: string
  local_snapshot: string | null
  server_snapshot: string | null
  detected_at: string
  resolved_at: string | null
  resolution: string | null
}

export interface SaleCreateResult {
  sale: LocalSale
  receipt: Receipt
  printResult?: { ok: boolean; message?: string }
  duplicate?: boolean
}

export interface PreloadApi {
  window: {
    minimize(): Promise<void>
    maximize(): Promise<void>
    unmaximize(): Promise<void>
    close(): Promise<void>
    isMaximized(): Promise<boolean>
    onMaximizeChange(cb: (isMaximized: boolean) => void): () => void
    /** Pass a PNG/JPEG data: URI, or null to restore the app's own icon. */
    setIcon(dataUri: string | null): Promise<void>
  }
  system: {
    getVersion(): Promise<string>
    getPlatform(): Promise<string>
    getOnlineStatus(): Promise<OnlineStatus>
    onOnlineStatusChange(cb: (status: OnlineStatus) => void): () => void
  }
  auth: {
    login(email: string, password: string): Promise<PublicSessionInfo>
    logout(): Promise<void>
    restoreSession(): Promise<PublicSessionInfo>
    getSession(): Promise<PublicSessionInfo>
    refreshUser(): Promise<PublicSessionInfo['user']>
  }
  context: {
    get(): Promise<{
      business: BusinessInfo | null
      branch: (BranchInfo & { id: number }) | null
      features: string[]
      businessType: BusinessTypeBranding | null
    }>
    /** Re-fetch the business profile (incl. logo) from the server; resolves to the cached copy when offline. */
    refreshBusiness(): Promise<BusinessInfo | null>
  }
  device: {
    getStatus(): Promise<DeviceStatus>
    suggestedName(): Promise<string>
    register(branchId: number, name: string): Promise<DeviceStatus>
    forget(): Promise<void>
    validate(): Promise<DeviceStatus & { unauthorized: boolean; message?: string }>
  }
  sync: {
    runInitial(): Promise<void>
    runIncremental(): Promise<void>
    getStatus(): Promise<SyncStatusSummary>
    retryFailed(): Promise<number>
    getQueue(): Promise<SyncQueueItem[]>
    getConflicts(): Promise<ConflictRow[]>
    resolveConflict(id: number, resolution: string): Promise<void>
    onProgress(cb: (event: SyncProgressEvent) => void): () => void
    onStatusChange(cb: (status: SyncStatusSummary) => void): () => void
  }
  catalog: {
    searchProducts(query: string): Promise<Product[]>
    getProductByBarcode(barcode: string): Promise<Product | null>
    listCategories(): Promise<Category[]>
    listCustomers(): Promise<Customer[]>
    searchCustomers(query: string): Promise<Customer[]>
    listPaymentMethods(): Promise<PaymentMethod[]>
    /** Immediately caches a server-created product locally so it's usable in the current cart before the next sync cycle. */
    upsertLocalProduct(product: Product): Promise<void>
  }
  sales: {
    create(input: CreateSaleInput): Promise<SaleCreateResult>
    list(limit?: number): Promise<LocalSale[]>
    get(localId: string): Promise<LocalSale | null>
    getReceipt(localId: string): Promise<Receipt | null>
  }
  inventory: {
    lowStock(): Promise<Array<Product & { stock_quantity: number }>>
  }
  remote: {
    request<T = unknown>(payload: RemoteRequestPayload): Promise<RemoteResponse<T>>
    upload<T = unknown>(payload: RemoteUploadPayload): Promise<RemoteResponse<T>>
  }
  media: {
    /** A server image as a data: URI (null if unavailable/offline). */
    fetchImage(url: string): Promise<string | null>
  }
  printer: {
    list(): Promise<PrinterInfo[]>
    getDefault(): Promise<PrinterConfig>
    setDefault(config: Partial<PrinterConfig>): Promise<PrinterConfig>
    printReceipt(localSaleId: string): Promise<{ ok: boolean; message?: string }>
    openCashDrawer(): Promise<{ ok: boolean; message?: string }>
  }
  settings: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    getAll(): Promise<Record<string, string>>
  }
  updater: {
    check(): Promise<void>
    download(): Promise<void>
    quitAndInstall(): Promise<void>
    onEvent(cb: (event: UpdaterEvent) => void): () => void
  }
  logs: {
    getRecent(): Promise<string[]>
    openFolder(): Promise<void>
  }
}
