import { EventEmitter } from 'node:events'
import {
  apiSyncBootstrap,
  apiSyncCategories,
  apiSyncCustomers,
  apiSyncInventory,
  apiSyncProducts,
  apiSyncPushSale,
  type CursorPage
} from '../api/syncApi'
import { ApiRequestError, normalizeAxiosError } from '../api/httpClient'
import {
  replacePaymentMethods,
  softDeleteCategories,
  softDeleteCustomers,
  softDeleteProducts,
  upsertCategories,
  upsertCustomers,
  upsertInventory,
  upsertProducts,
  type UpsertCategoryRow,
  type UpsertCustomerRow,
  type UpsertProductRow
} from '../db/repositories/catalogRepo'
import { getCachedBranch, saveBranch, saveBusiness, saveFeatures } from '../db/repositories/contextRepo'
import {
  getCursor,
  getPendingSyncQueue,
  incrementQueueAttempts,
  markQueueItemStatus,
  recordConflict,
  setCursor,
  syncQueueCounts,
  getLastSyncedAt
} from '../db/repositories/syncMetaRepo'
import { markSaleSynced, updateSaleSyncStatus } from '../db/repositories/salesRepo'
import { onlineMonitor } from './onlineMonitor'
import { scoped } from '../logging/logger'
import type { SyncProgressEvent, SyncStatusSummary } from '@shared/types'
import type { SyncSalePayload } from '../api/syncApi'

const log = scoped('sync-engine')

const MAX_QUEUE_ATTEMPTS = 8

class SyncEngine extends EventEmitter {
  private syncing = false

  isSyncing(): boolean {
    return this.syncing
  }

  private progress(event: SyncProgressEvent): void {
    this.emit('progress', event)
  }

  private statusChanged(): void {
    this.emit('status-change', this.getStatus())
  }

  /**
   * Public trigger for callers outside the sync engine itself that just
   * changed something the status summary depends on — e.g. a new offline
   * sale queued while there's no connectivity to actually run a sync pass
   * (so runIncrementalSync's own statusChanged() call never fires). Without
   * this, Settings > Sync Status only refreshes on the next real sync run,
   * which can be arbitrarily far in the future while offline.
   */
  notifyStatusChanged(): void {
    this.statusChanged()
  }

  getStatus(): SyncStatusSummary {
    const counts = syncQueueCounts()
    return {
      lastFullSyncAt: getLastSyncedAt('bootstrap'),
      lastIncrementalSyncAt: getLastSyncedAt('products'),
      pendingCount: counts.pending,
      syncedCount: counts.synced,
      failedCount: counts.failed,
      conflictCount: counts.conflict,
      isSyncing: this.syncing,
      online: onlineMonitor.getStatus()
    }
  }

  /** Phase 05: full initial download of everything a fresh install needs. */
  async runInitialSync(): Promise<void> {
    if (this.syncing) return
    this.syncing = true
    this.statusChanged()
    try {
      this.progress({ phase: 'preparing', message: 'Preparing device...' })
      const boot = await apiSyncBootstrap()
      saveBusiness(boot.business)
      saveBranch({ ...boot.branch, is_main: false })
      saveFeatures(boot.features)
      replacePaymentMethods(boot.payment_methods)

      await this.pullAllCategories(null)
      await this.pullAllProducts(null)
      await this.pullAllCustomers(null)
      await this.pullAllInventory(null)

      this.progress({ phase: 'finalizing', message: 'Finalizing...' })
      await this.processQueue()
      setCursor('bootstrap', new Date().toISOString())

      this.progress({ phase: 'ready', message: 'Ready' })
      log.info('Initial sync completed successfully.')
    } catch (err) {
      this.progress({ phase: 'error', message: this.describeError(err) })
      log.error('Initial sync failed', err)
      throw err
    } finally {
      this.syncing = false
      this.statusChanged()
    }
  }

  /** Phase 06: incremental pull (cursor-based) + push of the local sale queue. */
  async runIncrementalSync(): Promise<void> {
    if (this.syncing) return
    if (onlineMonitor.getStatus() !== 'online') return
    this.syncing = true
    this.statusChanged()
    try {
      await this.processQueue()

      this.progress({ phase: 'categories', message: 'Syncing categories...' })
      await this.pullAllCategories(getCursor('categories'))

      this.progress({ phase: 'products', message: 'Syncing products...' })
      await this.pullAllProducts(getCursor('products'))

      this.progress({ phase: 'customers', message: 'Syncing customers...' })
      await this.pullAllCustomers(getCursor('customers'))

      this.progress({ phase: 'inventory', message: 'Updating inventory...' })
      await this.pullAllInventory(getCursor('inventory'))

      this.progress({ phase: 'ready', message: 'Up to date' })
    } catch (err) {
      this.progress({ phase: 'error', message: this.describeError(err) })
      log.warn('Incremental sync did not complete', err)
    } finally {
      this.syncing = false
      this.statusChanged()
    }
  }

  /** Pushes every pending/failed queued sale. Never blindly overwrites — idempotent on client_transaction_id. */
  async processQueue(): Promise<void> {
    if (onlineMonitor.getStatus() !== 'online') return
    const items = getPendingSyncQueue(100)
    if (items.length === 0) return
    for (const item of items) {
      markQueueItemStatus(item.operation_id, 'syncing')
      updateSaleSyncStatus(item.local_id, 'syncing')
      try {
        const payload = JSON.parse(item.payload) as SyncSalePayload
        const result = await apiSyncPushSale(payload)
        markSaleSynced(item.local_id, result.server_id, result.invoice_number)
        markQueueItemStatus(item.operation_id, 'synced')
        log.info(`Sale ${item.local_id} synced as invoice ${result.invoice_number}`)
      } catch (err) {
        const normalized = err instanceof ApiRequestError ? err : new ApiRequestError(normalizeAxiosError(err))
        incrementQueueAttempts(item.operation_id)

        if (normalized.isNetworkError) {
          // Connectivity dropped mid-sync — leave pending, no penalty.
          markQueueItemStatus(item.operation_id, 'pending', normalized.message)
          updateSaleSyncStatus(item.local_id, 'pending')
          break
        }

        if (normalized.errorType === 'conflict') {
          recordConflict({
            entity: 'sale',
            local_id: item.local_id,
            server_id: null,
            reason: normalized.message,
            local_snapshot: item.payload,
            server_snapshot: null,
            detected_at: new Date().toISOString()
          })
          markQueueItemStatus(item.operation_id, 'conflict', normalized.message)
          updateSaleSyncStatus(item.local_id, 'conflict')
          continue
        }

        const shouldGiveUp = normalized.errorType === 'non_retryable' || item.attempts + 1 >= MAX_QUEUE_ATTEMPTS
        const nextStatus = shouldGiveUp ? 'failed' : 'pending'
        markQueueItemStatus(item.operation_id, nextStatus, normalized.message)
        updateSaleSyncStatus(item.local_id, nextStatus)
        log.warn(`Sale ${item.local_id} sync attempt failed (${nextStatus})`, normalized.message)
      }
    }
    this.statusChanged()
  }

  private async pullAllCategories(since: string | null): Promise<void> {
    let page = 1
    let cursor = since
    for (;;) {
      const result: CursorPage<UpsertCategoryRow> = await apiSyncCategories(since, page)
      upsertCategories(result.data)
      softDeleteCategories(result.deleted_ids)
      cursor = result.cursor
      if (!result.meta.has_more) break
      page += 1
    }
    if (cursor) setCursor('categories', cursor)
  }

  private async pullAllProducts(since: string | null): Promise<void> {
    let page = 1
    let cursor = since
    let total = 0
    for (;;) {
      const result: CursorPage<UpsertProductRow> = await apiSyncProducts(since, page)
      upsertProducts(result.data)
      softDeleteProducts(result.deleted_ids)
      total += result.data.length
      cursor = result.cursor
      this.progress({ phase: 'products', message: 'Downloading products...', current: total, total: result.meta.total })
      if (!result.meta.has_more) break
      page += 1
    }
    if (cursor) setCursor('products', cursor)
  }

  private async pullAllCustomers(since: string | null): Promise<void> {
    let page = 1
    let cursor = since
    for (;;) {
      const result: CursorPage<UpsertCustomerRow> = await apiSyncCustomers(since, page)
      upsertCustomers(result.data)
      softDeleteCustomers(result.deleted_ids)
      cursor = result.cursor
      if (!result.meta.has_more) break
      page += 1
    }
    if (cursor) setCursor('customers', cursor)
  }

  private async pullAllInventory(since: string | null): Promise<void> {
    let page = 1
    let cursor = since
    const branchRows: Array<{ product_id: number; branch_id: number; quantity: number; updated_at: string }> = []
    // Branch id is resolved once, from the cached branch context saved during bootstrap.
    const branch = getCachedBranch()
    if (!branch) return

    for (;;) {
      const result: CursorPage<{ product_id: number; quantity: number; updated_at: string }> = await apiSyncInventory(since, page)
      for (const row of result.data) {
        branchRows.push({ product_id: row.product_id, branch_id: branch.id, quantity: row.quantity, updated_at: row.updated_at })
      }
      cursor = result.cursor
      if (!result.meta.has_more) break
      page += 1
    }
    if (branchRows.length) upsertInventory(branchRows)
    if (cursor) setCursor('inventory', cursor)
  }

  private describeError(err: unknown): string {
    if (err instanceof ApiRequestError) {
      return err.isNetworkError ? 'Unable to reach the server. Will retry automatically.' : err.message
    }
    return err instanceof Error ? err.message : 'Sync failed for an unknown reason.'
  }
}

export const syncEngine = new SyncEngine()
