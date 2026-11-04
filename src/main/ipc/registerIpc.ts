import { ipcMain, BrowserWindow, app, shell } from 'electron'
import fs from 'node:fs'
import { IpcChannels } from '@shared/ipc-channels'
import type { CreateSaleInput, RemoteRequestPayload } from '@shared/types'

import { sessionManager } from '../auth/sessionManager'
import { deviceManager } from '../auth/deviceManager'
import { syncEngine } from '../sync/syncEngine'
import { onlineMonitor } from '../sync/onlineMonitor'
import { handleRemoteRequest } from '../api/remoteGateway'
import {
  getProductByBarcode,
  listCategories,
  listCustomers,
  listPaymentMethods,
  lowStockProducts,
  searchCustomers,
  searchProducts,
  upsertProducts,
  type UpsertProductRow
} from '../db/repositories/catalogRepo'
import {
  createLocalSale,
  DuplicateSaleError,
  InsufficientStockError,
  getByLocalId,
  listSales
} from '../db/repositories/salesRepo'
import { getCachedBranch, getCachedBusiness, getCachedFeatures } from '../db/repositories/contextRepo'
import { refreshBusinessContext } from '../api/businessContext'
import { getAllSettings, getFullSyncQueue, getSetting, listConflicts, resetFailedQueueItems, resolveConflict, setSetting } from '../db/repositories/syncMetaRepo'
import { buildReceiptFromLocalSale } from '../pos/receiptBuilder'
import { getPrinterSettings, listSystemPrinters, openCashDrawer, printReceipt, updatePrinterSettings } from '../hardware/printer'
import { updaterService } from '../updater/autoUpdater'
import { attachWindowStatePersistence, loadWindowState, saveWindowState } from '../windowState'
import { scoped } from '../logging/logger'
import { ApiRequestError } from '../api/httpClient'
import log from 'electron-log/main'
import type { IpcMainInvokeEvent } from 'electron'

const logger = scoped('ipc')

/**
 * Wraps every ipcMain.handle registration so a thrown ApiRequestError
 * (which loses its extra .status/.errors fields when Electron serializes
 * it across the IPC boundary — only .message survives) is turned into the
 * most useful single-line message BEFORE it crosses that boundary, and so
 * every failure is logged with its channel name (Phase 16's "API errors"
 * structured-logging requirement) instead of surfacing as a silent reject.
 */
function handle<T>(channel: string, fn: (event: IpcMainInvokeEvent, ...args: never[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await fn(event, ...(args as never[]))
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const firstFieldError = Object.values(err.errors)[0]?.[0]
        const message = firstFieldError ?? err.message
        logger.error(`[${channel}] API error (${err.status})`, message)
        throw new Error(message)
      }
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      logger.error(`[${channel}] failed`, err)
      throw new Error(message)
    }
  })
}

function requireActiveBranchId(): number {
  const branch = getCachedBranch()
  if (!branch) throw new Error('No branch context is cached locally yet. Please sign in and sync first.')
  return branch.id
}

function requireCashierId(): number {
  const user = sessionManager.getCurrentUser()
  if (!user) throw new Error('Not signed in.')
  return user.id
}

export function registerIpc(getMainWindow: () => BrowserWindow | null): void {
  // ---------- Window controls ----------
  handle(IpcChannels.WindowMinimize, () => getMainWindow()?.minimize())
  handle(IpcChannels.WindowMaximize, () => getMainWindow()?.maximize())
  handle(IpcChannels.WindowUnmaximize, () => getMainWindow()?.unmaximize())
  handle(IpcChannels.WindowClose, () => getMainWindow()?.close())
  handle(IpcChannels.WindowIsMaximized, () => getMainWindow()?.isMaximized() ?? false)

  // ---------- App / system ----------
  handle(IpcChannels.AppGetVersion, () => app.getVersion())
  handle(IpcChannels.AppGetPlatform, () => process.platform)
  handle(IpcChannels.SystemOnlineStatus, () => onlineMonitor.getStatus())

  onlineMonitor.on('change', (status) => {
    getMainWindow()?.webContents.send(IpcChannels.SystemOnOnlineStatusChange, status)
    // Only an already-registered device has any local data worth refreshing
    // — attempting this before registration just produces a noisy, expected
    // 401 against every sync/* endpoint (device.active middleware).
    if (status === 'online' && deviceManager.status().isRegistered) void syncEngine.runIncrementalSync()
  })

  // ---------- Auth ----------
  handle(IpcChannels.AuthLogin, async (_e, email: string, password: string) => {
    return sessionManager.login(email, password)
  })
  handle(IpcChannels.AuthLogout, async () => sessionManager.logout())
  handle(IpcChannels.AuthRestoreSession, async () => sessionManager.restore())
  handle(IpcChannels.AuthGetSession, () => sessionManager.getSession())
  handle(IpcChannels.AuthRefreshUser, async () => sessionManager.refreshUser())

  // ---------- Cached context ----------
  handle(IpcChannels.ContextGet, () => ({
    business: getCachedBusiness(),
    branch: getCachedBranch(),
    features: getCachedFeatures()
  }))
  handle(IpcChannels.ContextRefreshBusiness, async () => refreshBusinessContext())

  // ---------- Device ----------
  handle(IpcChannels.DeviceGetStatus, () => deviceManager.status())
  handle(IpcChannels.DeviceSuggestedName, () => deviceManager.suggestedDeviceName())
  handle(IpcChannels.DeviceRegister, async (_e, branchId: number, name: string) => {
    const status = await deviceManager.register(branchId, name)
    // A freshly registered device has nothing locally yet — kick off the
    // initial sync right away rather than waiting for the user to notice.
    void syncEngine.runInitialSync()
    return status
  })
  handle(IpcChannels.DeviceForget, () => deviceManager.forget())
  handle(IpcChannels.DeviceValidate, async () => deviceManager.validate())

  // ---------- Sync ----------
  handle(IpcChannels.SyncRunInitial, async () => syncEngine.runInitialSync())
  handle(IpcChannels.SyncRunIncremental, async () => syncEngine.runIncrementalSync())
  handle(IpcChannels.SyncGetStatus, () => syncEngine.getStatus())
  handle(IpcChannels.SyncRetryFailed, () => resetFailedQueueItems())
  handle(IpcChannels.SyncGetQueue, () => getFullSyncQueue())
  handle(IpcChannels.SyncGetConflicts, () => listConflicts())
  handle(IpcChannels.SyncResolveConflict, (_e, id: number, resolution: string) => resolveConflict(id, resolution))

  syncEngine.on('progress', (event) => getMainWindow()?.webContents.send(IpcChannels.SyncOnProgress, event))
  syncEngine.on('status-change', (status) => getMainWindow()?.webContents.send(IpcChannels.SyncOnStatusChange, status))

  // ---------- Local catalog ----------
  handle(IpcChannels.CatalogSearchProducts, (_e, query: string) => searchProducts(requireActiveBranchId(), query))
  handle(IpcChannels.CatalogGetProductByBarcode, (_e, barcode: string) =>
    getProductByBarcode(requireActiveBranchId(), barcode)
  )
  handle(IpcChannels.CatalogListCategories, () => listCategories())
  handle(IpcChannels.CatalogListCustomers, () => listCustomers())
  handle(IpcChannels.CatalogSearchCustomers, (_e, query: string) => searchCustomers(query))
  handle(IpcChannels.CatalogListPaymentMethods, () => listPaymentMethods())
  // Lets the POS quick-create-product flow (Phase 08) make a freshly
  // server-created product usable in the current cart immediately, instead
  // of waiting for the next incremental sync cycle to pull it down.
  handle(IpcChannels.CatalogUpsertLocalProduct, (_e, product: UpsertProductRow) => upsertProducts([product]))

  // ---------- Sales (offline-first POS) ----------
  handle(IpcChannels.SalesCreate, async (_e, input: CreateSaleInput) => {
    const cashierId = requireCashierId()
    try {
      const sale = createLocalSale(input, cashierId)
      const receipt = buildReceiptFromLocalSale(sale)
      // Settings > Sync Status (and the Topbar's pending-count badge) only
      // re-render on this event — without it, a queued offline sale is
      // invisible there until the next real sync run happens to fire it.
      syncEngine.notifyStatusChanged()

      // Best-effort immediate sync — never blocks the cashier if it fails;
      // the sale is already durably saved and queued either way.
      if (onlineMonitor.getStatus() === 'online') {
        void syncEngine.processQueue().catch((err) => logger.warn('Post-sale immediate sync failed', err))
      }

      // Printing is deliberately NOT awaited here: a slow/unavailable
      // printer must never delay the "sale complete" response the cashier
      // is waiting on (Phase 09 — "sale must not disappear" on a printer
      // problem implies checkout itself can't be gated on printing either).
      // The renderer triggers the actual print separately once it shows the
      // success screen, via the same printer.printReceipt() IPC call used
      // for a manual reprint, so both paths share one code path.
      return { sale, receipt }
    } catch (err) {
      if (err instanceof DuplicateSaleError) {
        const receipt = buildReceiptFromLocalSale(err.existing)
        return { sale: err.existing, receipt, duplicate: true }
      }
      if (err instanceof InsufficientStockError) {
        throw new Error(err.message)
      }
      throw err
    }
  })
  handle(IpcChannels.SalesList, (_e, limit?: number) => listSales(requireActiveBranchId(), limit))
  handle(IpcChannels.SalesGet, (_e, localId: string) => getByLocalId(localId))
  handle(IpcChannels.SalesGetReceipt, (_e, localId: string) => {
    const sale = getByLocalId(localId)
    return sale ? buildReceiptFromLocalSale(sale) : null
  })

  // ---------- Inventory ----------
  handle(IpcChannels.InventoryLowStock, () => lowStockProducts(requireActiveBranchId()))

  // ---------- Generic authenticated remote passthrough ----------
  handle(IpcChannels.RemoteRequest, async (_e, payload: RemoteRequestPayload) => handleRemoteRequest(payload))

  // ---------- Printer / hardware ----------
  handle(IpcChannels.PrinterList, () => listSystemPrinters())
  handle(IpcChannels.PrinterGetDefault, () => getPrinterSettings())
  handle(IpcChannels.PrinterSetDefault, (_e, config) => updatePrinterSettings(config))
  handle(IpcChannels.PrinterPrintReceipt, async (_e, localSaleId: string) => {
    const sale = getByLocalId(localSaleId)
    if (!sale) return { ok: false, message: 'Sale not found.' }
    const receipt = buildReceiptFromLocalSale(sale)
    return printReceipt(receipt, false)
  })
  handle(IpcChannels.PrinterOpenCashDrawer, () => openCashDrawer())

  // ---------- Settings ----------
  handle(IpcChannels.SettingsGet, (_e, key: string) => getSetting(key))
  handle(IpcChannels.SettingsSet, (_e, key: string, value: string) => setSetting(key, value))
  handle(IpcChannels.SettingsGetAll, () => getAllSettings())

  // ---------- Auto-update ----------
  handle(IpcChannels.UpdaterCheck, () => updaterService.check())
  handle(IpcChannels.UpdaterDownload, () => updaterService.download())
  handle(IpcChannels.UpdaterQuitAndInstall, () => updaterService.quitAndInstall())
  updaterService.on('event', (event) => getMainWindow()?.webContents.send(IpcChannels.UpdaterOnEvent, event))

  // ---------- Logs ----------
  handle(IpcChannels.LogsGetRecent, () => readRecentLogLines())
  handle(IpcChannels.LogsOpenFolder, () => shell.openPath(app.getPath('userData') + '/logs'))
}

function readRecentLogLines(maxLines = 300): string[] {
  try {
    const filePath = log.transports.file.getFile().path
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').filter(Boolean)
    return lines.slice(-maxLines)
  } catch {
    return []
  }
}

export function registerWindowStateHandlers(win: BrowserWindow): void {
  attachWindowStatePersistence(win)
  win.on('maximize', () => win.webContents.send(IpcChannels.WindowOnMaximizeChange, true))
  win.on('unmaximize', () => win.webContents.send(IpcChannels.WindowOnMaximizeChange, false))
}

export { loadWindowState, saveWindowState }
