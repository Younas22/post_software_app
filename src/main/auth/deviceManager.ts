import { EventEmitter } from 'node:events'
import os from 'node:os'
import { apiGetCurrentDevice, apiRegisterDevice } from '../api/deviceApi'
import { getDeviceToken, setDeviceToken } from './secureStore'
import { getSetting, setSetting, clearAllCursors } from '../db/repositories/syncMetaRepo'
import { resetCachedCatalog } from '../db/repositories/catalogRepo'
import { resetCachedContext } from '../db/repositories/contextRepo'
import { ApiRequestError } from '../api/httpClient'
import { onlineMonitor } from '../sync/onlineMonitor'
import { scoped } from '../logging/logger'
import type { DevicePlatform, DeviceRecord, DeviceStatus } from '@shared/types'

const log = scoped('device')
const DEVICE_RECORD_KEY = 'device_record'

function currentPlatform(): DevicePlatform {
  if (process.platform === 'win32') return 'windows'
  if (process.platform === 'darwin') return 'mac'
  return 'linux'
}

class DeviceManager extends EventEmitter {
  private record: DeviceRecord | null = null

  constructor() {
    super()
    const raw = getSetting(DEVICE_RECORD_KEY)
    if (raw) {
      try {
        this.record = JSON.parse(raw) as DeviceRecord
      } catch {
        this.record = null
      }
    }
  }

  status(): DeviceStatus {
    const hasToken = getDeviceToken() !== null
    return { isRegistered: hasToken && this.record !== null, device: this.record }
  }

  suggestedDeviceName(): string {
    return `${os.hostname()} (${currentPlatform() === 'windows' ? 'Windows' : currentPlatform() === 'mac' ? 'macOS' : 'Linux'})`
  }

  async register(branchId: number, name: string): Promise<DeviceStatus> {
    const { device, token } = await apiRegisterDevice(branchId, name, currentPlatform())
    setDeviceToken(token)
    this.record = device
    setSetting(DEVICE_RECORD_KEY, JSON.stringify(device))

    // This install's cached catalog (products/categories/customers/...) has
    // no business_id column — it assumes one installation belongs to one
    // business forever. Registering (or re-registering, e.g. after the
    // device-blocked-loop recovery) can point this same install at a
    // different business/branch than whatever it last synced, and a stale
    // cache would silently merge the old business's data into the new
    // one's views (see resetCachedCatalog). Always reset on register — the
    // caller (device-setup) already triggers a fresh runInitialSync()
    // right after this resolves, so nothing is left unsynced.
    resetCachedCatalog()
    resetCachedContext()
    clearAllCursors()

    log.info(`Device registered: ${device.name} (#${device.id}) for branch ${branchId} — local catalog cache reset`)
    this.emit('change', this.status())
    return this.status()
  }

  /** Confirms the stored device credential is still active. Safe to call offline (no-op, returns cached status). */
  async validate(): Promise<DeviceStatus & { unauthorized: boolean; message?: string }> {
    if (!getDeviceToken()) return { ...this.status(), unauthorized: false }
    if (onlineMonitor.getStatus() !== 'online') return { ...this.status(), unauthorized: false }

    try {
      const device = await apiGetCurrentDevice()
      this.record = device
      setSetting(DEVICE_RECORD_KEY, JSON.stringify(device))
      this.emit('change', this.status())
      return { ...this.status(), unauthorized: false }
    } catch (err) {
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 403)) {
        const message =
          err.status === 401
            ? 'This device is no longer recognized by the server. Please register it again.'
            : 'This device has been suspended or blocked by an administrator.'
        log.warn(`Device validation failed: ${message}`)
        return { ...this.status(), unauthorized: true, message }
      }
      // Network/server error — do not treat as unauthorized, just unknown for now.
      return { ...this.status(), unauthorized: false }
    }
  }

  forget(): void {
    setDeviceToken(null)
    this.record = null
    setSetting(DEVICE_RECORD_KEY, '')
    this.emit('change', this.status())
  }
}

export const deviceManager = new DeviceManager()
