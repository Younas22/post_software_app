import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { PreloadApi } from '@shared/preload-api'
import type {
  CreateSaleInput,
  DeviceStatus,
  OnlineStatus,
  PublicSessionInfo,
  RemoteRequestPayload,
  RemoteUploadPayload,
  SyncProgressEvent,
  SyncStatusSummary,
  UpdaterEvent
} from '@shared/types'

/**
 * The ONLY bridge between the sandboxed renderer and the main process.
 * Every function below maps to exactly one whitelisted IPC channel (see
 * src/shared/ipc-channels.ts + src/main/ipc/registerIpc.ts) — there is no
 * generic ipcRenderer.invoke/send exposed, so the renderer can never reach
 * a channel that wasn't deliberately designed for it, per the master
 * spec's "do not expose arbitrary IPC" rule.
 */
function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

/**
 * Electron's invoke() rejects with a message prefixed
 * `Error invoking remote method '<channel>': Error: <actual message>` —
 * useful for a developer console, but every renderer catch block in this
 * app shows `err.message` directly to the cashier/admin, so that boilerplate
 * would leak into the UI otherwise. Stripped here, once, at the only choke
 * point every IPC call goes through.
 */
function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args).catch((err: unknown) => {
    if (err instanceof Error) {
      err.message = err.message.replace(/^Error invoking remote method '[^']*':\s*(Error:\s*)?/, '')
    }
    throw err
  })
}

const api: PreloadApi = {
  window: {
    minimize: () => invoke(IpcChannels.WindowMinimize),
    maximize: () => invoke(IpcChannels.WindowMaximize),
    unmaximize: () => invoke(IpcChannels.WindowUnmaximize),
    close: () => invoke(IpcChannels.WindowClose),
    isMaximized: (): Promise<boolean> => invoke(IpcChannels.WindowIsMaximized),
    setIcon: (dataUri: string | null): Promise<void> => invoke(IpcChannels.WindowSetIcon, dataUri),
    onMaximizeChange: (cb: (isMaximized: boolean) => void) => subscribe(IpcChannels.WindowOnMaximizeChange, cb)
  },
  system: {
    getVersion: (): Promise<string> => invoke(IpcChannels.AppGetVersion),
    getPlatform: (): Promise<NodeJS.Platform> => invoke(IpcChannels.AppGetPlatform),
    getOnlineStatus: (): Promise<OnlineStatus> => invoke(IpcChannels.SystemOnlineStatus),
    onOnlineStatusChange: (cb: (status: OnlineStatus) => void) => subscribe(IpcChannels.SystemOnOnlineStatusChange, cb)
  },
  auth: {
    login: (email: string, password: string): Promise<PublicSessionInfo> =>
      invoke(IpcChannels.AuthLogin, email, password),
    logout: (): Promise<void> => invoke(IpcChannels.AuthLogout),
    restoreSession: (): Promise<PublicSessionInfo> => invoke(IpcChannels.AuthRestoreSession),
    getSession: (): Promise<PublicSessionInfo> => invoke(IpcChannels.AuthGetSession),
    refreshUser: (): Promise<PublicSessionInfo['user']> => invoke(IpcChannels.AuthRefreshUser)
  },
  context: {
    get: () => invoke(IpcChannels.ContextGet),
    refreshBusiness: () => invoke(IpcChannels.ContextRefreshBusiness)
  },
  device: {
    getStatus: (): Promise<DeviceStatus> => invoke(IpcChannels.DeviceGetStatus),
    suggestedName: (): Promise<string> => invoke(IpcChannels.DeviceSuggestedName),
    register: (branchId: number, name: string): Promise<DeviceStatus> =>
      invoke(IpcChannels.DeviceRegister, branchId, name),
    forget: (): Promise<void> => invoke(IpcChannels.DeviceForget),
    validate: () => invoke(IpcChannels.DeviceValidate)
  },
  sync: {
    runInitial: (): Promise<void> => invoke(IpcChannels.SyncRunInitial),
    runIncremental: (): Promise<void> => invoke(IpcChannels.SyncRunIncremental),
    getStatus: (): Promise<SyncStatusSummary> => invoke(IpcChannels.SyncGetStatus),
    retryFailed: (): Promise<number> => invoke(IpcChannels.SyncRetryFailed),
    getQueue: () => invoke(IpcChannels.SyncGetQueue),
    getConflicts: () => invoke(IpcChannels.SyncGetConflicts),
    resolveConflict: (id: number, resolution: string) => invoke(IpcChannels.SyncResolveConflict, id, resolution),
    onProgress: (cb: (event: SyncProgressEvent) => void) => subscribe(IpcChannels.SyncOnProgress, cb),
    onStatusChange: (cb: (status: SyncStatusSummary) => void) => subscribe(IpcChannels.SyncOnStatusChange, cb)
  },
  catalog: {
    searchProducts: (query: string) => invoke(IpcChannels.CatalogSearchProducts, query),
    getProductByBarcode: (barcode: string) => invoke(IpcChannels.CatalogGetProductByBarcode, barcode),
    listCategories: () => invoke(IpcChannels.CatalogListCategories),
    listCustomers: () => invoke(IpcChannels.CatalogListCustomers),
    searchCustomers: (query: string) => invoke(IpcChannels.CatalogSearchCustomers, query),
    listPaymentMethods: () => invoke(IpcChannels.CatalogListPaymentMethods),
    upsertLocalProduct: (product: unknown) => invoke(IpcChannels.CatalogUpsertLocalProduct, product)
  },
  sales: {
    create: (input: CreateSaleInput) => invoke(IpcChannels.SalesCreate, input),
    list: (limit?: number) => invoke(IpcChannels.SalesList, limit),
    get: (localId: string) => invoke(IpcChannels.SalesGet, localId),
    getReceipt: (localId: string) => invoke(IpcChannels.SalesGetReceipt, localId)
  },
  inventory: {
    lowStock: () => invoke(IpcChannels.InventoryLowStock)
  },
  remote: {
    request: (payload: RemoteRequestPayload) => invoke(IpcChannels.RemoteRequest, payload),
    upload: (payload: RemoteUploadPayload) => invoke(IpcChannels.RemoteUpload, payload)
  },
  media: {
    fetchImage: (url: string) => invoke(IpcChannels.MediaFetchImage, url)
  },
  printer: {
    list: () => invoke(IpcChannels.PrinterList),
    getDefault: () => invoke(IpcChannels.PrinterGetDefault),
    setDefault: (config: unknown) => invoke(IpcChannels.PrinterSetDefault, config),
    printReceipt: (localSaleId: string) => invoke(IpcChannels.PrinterPrintReceipt, localSaleId),
    openCashDrawer: () => invoke(IpcChannels.PrinterOpenCashDrawer)
  },
  settings: {
    get: (key: string) => invoke(IpcChannels.SettingsGet, key),
    set: (key: string, value: string) => invoke(IpcChannels.SettingsSet, key, value),
    getAll: () => invoke(IpcChannels.SettingsGetAll)
  },
  updater: {
    check: () => invoke(IpcChannels.UpdaterCheck),
    download: () => invoke(IpcChannels.UpdaterDownload),
    quitAndInstall: () => invoke(IpcChannels.UpdaterQuitAndInstall),
    onEvent: (cb: (event: UpdaterEvent) => void) => subscribe(IpcChannels.UpdaterOnEvent, cb)
  },
  logs: {
    getRecent: (): Promise<string[]> => invoke(IpcChannels.LogsGetRecent),
    openFolder: () => invoke(IpcChannels.LogsOpenFolder)
  }
}

contextBridge.exposeInMainWorld('pos', api)
