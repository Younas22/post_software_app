import { EventEmitter } from 'node:events'
import { autoUpdater } from 'electron-updater'
import { app } from 'electron'
import { scoped } from '../logging/logger'
import type { UpdaterEvent } from '@shared/types'

const log = scoped('updater')

/**
 * Phase 13: production-ready auto-update architecture. electron-builder's
 * generic/GitHub/S3 providers all work through electron-updater unchanged;
 * this app ships with autoUpdater.autoDownload = false so the user always
 * gets a "Download update?" / "Restart to install?" prompt rather than a
 * silent background install that could interrupt a sale.
 *
 * Safety (Phase 13 rule): electron-updater only ever replaces the
 * application bundle in the install directory — it never touches
 * app.getPath('userData'), which is where SQLite, the sync queue, and all
 * local settings/device registration live (see src/main/db/index.ts). A
 * failed or interrupted update leaves the previous version's files intact
 * (NSIS/Squirrel both stage-then-swap), so local data is never at risk
 * either way.
 */
class UpdaterService extends EventEmitter {
  private initialized = false

  init(): void {
    if (this.initialized) return
    this.initialized = true

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = null

    autoUpdater.on('checking-for-update', () => this.emitEvent({ type: 'checking-for-update' }))
    autoUpdater.on('update-available', (info) => this.emitEvent({ type: 'update-available', version: info.version }))
    autoUpdater.on('update-not-available', () => this.emitEvent({ type: 'update-not-available' }))
    autoUpdater.on('download-progress', (progress) =>
      this.emitEvent({ type: 'download-progress', percent: progress.percent })
    )
    autoUpdater.on('update-downloaded', (info) => this.emitEvent({ type: 'update-downloaded', version: info.version }))
    autoUpdater.on('error', (err) => {
      log.error('Auto-update error', err)
      this.emitEvent({ type: 'error', message: err.message })
    })
  }

  private emitEvent(event: UpdaterEvent): void {
    this.emit('event', event)
  }

  async check(): Promise<void> {
    if (!app.isPackaged) {
      // electron-updater requires a packaged build with a dev-app-update.yml
      // or a real update feed — checking in `npm run dev` would only error.
      this.emitEvent({ type: 'update-not-available', message: 'Update checks are disabled in development.' })
      return
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      log.error('checkForUpdates failed', err)
    }
  }

  async download(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      log.error('downloadUpdate failed', err)
      this.emitEvent({ type: 'error', message: err instanceof Error ? err.message : 'Download failed.' })
    }
  }

  quitAndInstall(): void {
    autoUpdater.quitAndInstall()
  }
}

export const updaterService = new UpdaterService()
