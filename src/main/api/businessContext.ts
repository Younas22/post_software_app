import axios from 'axios'
import { apiGetConfig } from './configApi'
import { getCachedBusiness, saveBusiness, saveBusinessLogoData, saveBusinessType } from '../db/repositories/contextRepo'
import { scoped } from '../logging/logger'
import type { BusinessInfo } from '@shared/types'

const log = scoped('business-context')

/** Matches the server's own upload limit (2MB) with a little headroom. */
const MAX_LOGO_BYTES = 3 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp']

/**
 * Downloads the business logo once per logo URL and caches it in SQLite as a
 * data: URI, so the app chrome can show it offline and within the renderer
 * CSP (img-src 'self' data: blob:). Never throws — branding is best-effort
 * and must never block login or sync.
 */
export async function cacheBusinessLogo(): Promise<void> {
  const business = getCachedBusiness()
  if (!business?.logo_url || business.logo_data) return

  try {
    const url = new URL(business.logo_url)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return

    const res = await axios.get<ArrayBuffer>(url.toString(), {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: MAX_LOGO_BYTES
    })
    const type = String(res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_TYPES.includes(type)) {
      log.warn(`Business logo has unexpected content type "${type}" — not caching.`)
      return
    }

    const dataUri = `data:${type};base64,${Buffer.from(res.data).toString('base64')}`
    saveBusinessLogoData(business.id, business.logo_url, dataUri)
  } catch (err) {
    log.warn('Could not download business logo (will retry on next refresh).', err instanceof Error ? err.message : err)
  }
}

/**
 * Re-reads the business profile (name, currency, timezone, logo) from the
 * server — picks up changes made in Settings or by the Super Admin without
 * waiting for a full re-sync. Returns the cached copy when offline.
 */
export async function refreshBusinessContext(): Promise<BusinessInfo | null> {
  try {
    const config = await apiGetConfig()
    if (config.business) saveBusiness(config.business)
    // Theme/terminology/modules can change in Admin → Business Types at any time.
    if (config.business) saveBusinessType(config.business_type)
  } catch (err) {
    log.warn('Business refresh failed — keeping cached business.', err instanceof Error ? err.message : err)
    return getCachedBusiness()
  }

  await cacheBusinessLogo()
  return getCachedBusiness()
}
