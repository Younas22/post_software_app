import { EventEmitter } from 'node:events'
import { apiFetchCurrentUser, apiLogin, apiLogout } from '../api/authApi'
import { apiGetConfig } from '../api/configApi'
import { cacheBusinessLogo } from '../api/businessContext'
import { clearAll, getUserToken, setUserToken } from './secureStore'
import { getSingleCachedUser, saveBranch, saveBusiness, saveBusinessType, saveFeatures, saveUser } from '../db/repositories/contextRepo'
import { getSetting, setSetting } from '../db/repositories/syncMetaRepo'
import { ApiRequestError } from '../api/httpClient'
import { onlineMonitor } from '../sync/onlineMonitor'
import { scoped } from '../logging/logger'
import type { AuthUser, PublicSessionInfo } from '@shared/types'

const log = scoped('session')

// How long a cached session may be used while completely offline before we
// require a fresh online validation (Phase 12: "do not invent unlimited
// offline access" — a bounded grace window, not an indefinite bypass).
const OFFLINE_SESSION_GRACE_HOURS = 72
const LAST_VALIDATED_KEY = 'session_last_validated_at'

class SessionManager extends EventEmitter {
  private user: AuthUser | null = null

  getSession(): PublicSessionInfo {
    return { isAuthenticated: this.user !== null, user: this.user }
  }

  getCurrentUser(): AuthUser | null {
    return this.user
  }

  private setUser(user: AuthUser | null): void {
    this.user = user
    this.emit('change', this.getSession())
  }

  async login(email: string, password: string): Promise<PublicSessionInfo> {
    const deviceName = `${process.platform}-desktop-${(await import('node:os')).hostname()}`
    const { token, user } = await apiLogin(email, password, deviceName)
    setUserToken(token)
    saveUser(user)
    setSetting(LAST_VALIDATED_KEY, new Date().toISOString())

    try {
      const config = await apiGetConfig()
      if (config.business) {
        saveBusiness(config.business)
        await cacheBusinessLogo()
      }
      if (config.branch) saveBranch({ ...config.branch, is_main: config.branch.is_main })
      saveFeatures(config.features)
      saveBusinessType(config.business_type)
    } catch (err) {
      log.warn('Login succeeded but /config failed — continuing with login payload only.', err)
    }

    this.setUser(user)
    return this.getSession()
  }

  async logout(): Promise<void> {
    try {
      if (onlineMonitor.getStatus() === 'online') await apiLogout()
    } catch (err) {
      log.warn('Server-side logout failed (continuing with local logout).', err)
    }
    setUserToken(null)
    this.setUser(null)
  }

  /** Called once at app startup. Never throws — always resolves to a session state. */
  async restore(): Promise<PublicSessionInfo> {
    const token = getUserToken()
    if (!token) return this.getSession()

    if (onlineMonitor.getStatus() === 'online') {
      try {
        const user = await apiFetchCurrentUser()
        saveUser(user)
        setSetting(LAST_VALIDATED_KEY, new Date().toISOString())
        this.setUser(user)
        return this.getSession()
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 401) {
          log.info('Stored session token was rejected by the server — logging out locally.')
          setUserToken(null)
          this.setUser(null)
          return this.getSession()
        }
        log.warn('Could not validate session online — falling back to offline grace period.', err)
      }
    }

    return this.restoreFromOfflineCache()
  }

  private restoreFromOfflineCache(): PublicSessionInfo {
    const lastValidated = getSetting(LAST_VALIDATED_KEY)
    if (!lastValidated) return this.getSession()

    const hoursSince = (Date.now() - new Date(lastValidated).getTime()) / 36e5
    if (hoursSince > OFFLINE_SESSION_GRACE_HOURS) {
      log.warn(`Offline session grace period (${OFFLINE_SESSION_GRACE_HOURS}h) exceeded — blocking access until reconnect.`)
      return this.getSession()
    }

    const cached = getSingleCachedUser()
    if (cached) {
      this.setUser(cached)
    }
    return this.getSession()
  }

  async refreshUser(): Promise<AuthUser | null> {
    if (onlineMonitor.getStatus() !== 'online') return this.user
    try {
      const user = await apiFetchCurrentUser()
      saveUser(user)
      setSetting(LAST_VALIDATED_KEY, new Date().toISOString())
      this.setUser(user)
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setUserToken(null)
        this.setUser(null)
      }
    }
    return this.user
  }

  /** Full local wipe on unauthorized/forced-logout paths (does not touch synced sale history). */
  clearCredentialsOnly(): void {
    clearAll()
    this.setUser(null)
  }
}

export const sessionManager = new SessionManager()
