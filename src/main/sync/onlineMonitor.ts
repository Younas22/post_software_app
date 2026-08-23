import { EventEmitter } from 'node:events'
import axios from 'axios'
import { getApiBaseUrl } from '../api/httpClient'
import { scoped } from '../logging/logger'
import type { OnlineStatus } from '@shared/types'

const log = scoped('online-monitor')

/**
 * "Online" here specifically means "can reach the Laravel API" — not just
 * "has a network interface up" (Electron/Chromium's navigator.onLine can be
 * true on a LAN with no route to the configured server). A lightweight
 * periodic GET /health call is the ground truth the whole offline-first
 * design (Phase 06/07) keys off of.
 */
class OnlineMonitor extends EventEmitter {
  private status: OnlineStatus = 'connecting'
  private timer: NodeJS.Timeout | null = null
  private checking = false

  getStatus(): OnlineStatus {
    return this.status
  }

  private setStatus(next: OnlineStatus): void {
    if (next === this.status) return
    this.status = next
    log.info(`Connectivity status changed -> ${next}`)
    this.emit('change', next)
  }

  async checkNow(): Promise<OnlineStatus> {
    if (this.checking) return this.status
    this.checking = true
    try {
      const base = getApiBaseUrl().replace(/\/api\/v1\/?$/, '')
      await axios.get(`${base}/api/v1/health`, { timeout: 5000 })
      this.setStatus('online')
    } catch {
      this.setStatus('offline')
    } finally {
      this.checking = false
    }
    return this.status
  }

  start(intervalMs = 15000): void {
    if (this.timer) return
    void this.checkNow()
    this.timer = setInterval(() => void this.checkNow(), intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

export const onlineMonitor = new OnlineMonitor()
