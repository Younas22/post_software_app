import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { migrations } from './migrations'
import { scoped } from '../logging/logger'

const log = scoped('db')

let instance: Database.Database | null = null

/**
 * Production SQLite lives in Electron's per-OS user-data directory, never
 * inside the application installation directory (Phase 14 rule — the
 * install dir is read-only after signing on Windows/macOS and gets wiped
 * out on upgrade/uninstall either way).
 */
export function databaseFilePath(): string {
  return path.join(app.getPath('userData'), 'data', 'pos-desktop.sqlite3')
}

export function getDb(): Database.Database {
  if (instance) return instance

  const file = databaseFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })

  log.info(`Opening SQLite database at ${file}`)
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)

  instance = db
  return db
}

function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`)

  const applied = new Set(
    (db.prepare('SELECT id FROM _migrations').all() as Array<{ id: number }>).map((r) => r.id)
  )

  const pending = migrations.filter((m) => !applied.has(m.id)).sort((a, b) => a.id - b.id)
  if (pending.length === 0) {
    log.info('SQLite schema up to date.')
    return
  }

  for (const migration of pending) {
    log.info(`Applying migration #${migration.id}: ${migration.name}`)
    const run = db.transaction(() => {
      migration.up(db)
      db.prepare('INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
        migration.id,
        migration.name,
        new Date().toISOString()
      )
    })
    try {
      run()
    } catch (err) {
      // A failed migration must never leave existing valid data destroyed —
      // the transaction above already rolled back; we just log and rethrow
      // so app startup surfaces the problem instead of silently continuing
      // on a half-migrated schema.
      log.error(`Migration #${migration.id} (${migration.name}) failed`, err)
      throw err
    }
  }
}

export function closeDb(): void {
  if (instance) {
    instance.close()
    instance = null
  }
}
