import { getDb } from '../index'
import type { SaleSyncStatus, SyncQueueItem } from '@shared/types'

export function getCursor(entity: string): string | null {
  const row = getDb().prepare('SELECT cursor FROM sync_cursors WHERE entity = ?').get(entity) as
    | { cursor: string | null }
    | undefined
  return row?.cursor ?? null
}

export function setCursor(entity: string, cursor: string): void {
  getDb()
    .prepare(
      `INSERT INTO sync_cursors (entity, cursor, last_synced_at) VALUES (?, ?, ?)
       ON CONFLICT(entity) DO UPDATE SET cursor = excluded.cursor, last_synced_at = excluded.last_synced_at`
    )
    .run(entity, cursor, new Date().toISOString())
}

export function getLastSyncedAt(entity: string): string | null {
  const row = getDb().prepare('SELECT last_synced_at FROM sync_cursors WHERE entity = ?').get(entity) as
    | { last_synced_at: string | null }
    | undefined
  return row?.last_synced_at ?? null
}

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function getPendingSyncQueue(limit = 50): SyncQueueItem[] {
  return getDb()
    .prepare(`SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC LIMIT ?`)
    .all(limit) as SyncQueueItem[]
}

export function getFullSyncQueue(): SyncQueueItem[] {
  return getDb().prepare('SELECT * FROM sync_queue ORDER BY created_at DESC').all() as SyncQueueItem[]
}

export function markQueueItemStatus(operationId: string, status: SaleSyncStatus, lastError: string | null = null): void {
  getDb()
    .prepare('UPDATE sync_queue SET status = ?, last_error = ? WHERE operation_id = ?')
    .run(status, lastError, operationId)
}

export function incrementQueueAttempts(operationId: string): void {
  getDb().prepare('UPDATE sync_queue SET attempts = attempts + 1 WHERE operation_id = ?').run(operationId)
}

export function resetFailedQueueItems(): number {
  const result = getDb().prepare(`UPDATE sync_queue SET status = 'pending' WHERE status = 'failed'`).run()
  return result.changes
}

export function syncQueueCounts(): { pending: number; synced: number; failed: number; conflict: number } {
  const rows = getDb()
    .prepare('SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status')
    .all() as Array<{ status: string; count: number }>
  const out = { pending: 0, synced: 0, failed: 0, conflict: 0 }
  for (const row of rows) {
    if (row.status in out) (out as Record<string, number>)[row.status] = row.count
  }
  return out
}

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

export function recordConflict(row: Omit<ConflictRow, 'id' | 'resolved_at' | 'resolution'>): void {
  getDb()
    .prepare(
      `INSERT INTO sync_conflicts (entity, local_id, server_id, reason, local_snapshot, server_snapshot, detected_at)
       VALUES (@entity, @local_id, @server_id, @reason, @local_snapshot, @server_snapshot, @detected_at)`
    )
    .run(row)
}

export function listConflicts(onlyUnresolved = true): ConflictRow[] {
  const sql = onlyUnresolved
    ? 'SELECT * FROM sync_conflicts WHERE resolved_at IS NULL ORDER BY detected_at DESC'
    : 'SELECT * FROM sync_conflicts ORDER BY detected_at DESC'
  return getDb().prepare(sql).all() as ConflictRow[]
}

export function resolveConflict(id: number, resolution: string): void {
  getDb()
    .prepare('UPDATE sync_conflicts SET resolved_at = ?, resolution = ? WHERE id = ?')
    .run(new Date().toISOString(), resolution, id)
}
