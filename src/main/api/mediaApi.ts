import axios from 'axios'
import { getApiBaseUrl } from './httpClient'
import { userClient } from './clients'
import { scoped } from '../logging/logger'

const log = scoped('media')

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/x-icon', 'image/vnd.microsoft.icon']

/** url → data: URI, for the lifetime of the app process (avatars/logos rarely change; a new upload has a new URL). */
const cache = new Map<string, string>()

/**
 * The renderer's CSP only allows self/data:/blob: images, so a server image
 * (profile photo, the POS company's logo, a business-type login background)
 * is downloaded here and handed over as a data: URI. Only images hosted on
 * the configured Laravel server's own origin are fetched — the renderer
 * can't use this to reach an arbitrary host. Resolves null on any failure.
 */
export async function fetchImageAsDataUri(url: string): Promise<string | null> {
  if (!url) return null
  const cached = cache.get(url)
  if (cached) return cached

  try {
    const target = new URL(url)
    const apiOrigin = new URL(getApiBaseUrl()).origin
    if ((target.protocol !== 'http:' && target.protocol !== 'https:') || target.origin !== apiOrigin) {
      log.warn('Refused to fetch an image from a non-API origin', { origin: target.origin })
      return null
    }

    const res = await axios.get<ArrayBuffer>(target.toString(), {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: MAX_IMAGE_BYTES
    })
    const type = String(res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_TYPES.includes(type)) {
      log.warn(`Image has unexpected content type "${type}" — not shown.`)
      return null
    }

    const dataUri = `data:${type};base64,${Buffer.from(res.data).toString('base64')}`
    cache.set(url, dataUri)
    return dataUri
  } catch (err) {
    log.warn('Could not download image.', err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * A customer's photo — private on the server (no public URL), so it is
 * fetched with the signed-in user's token; the server applies the same
 * tenant policy as viewing the customer. Not cached across sessions.
 */
export async function fetchCustomerPhoto(customerId: number): Promise<string | null> {
  if (!Number.isInteger(customerId) || customerId <= 0) return null
  try {
    const res = await userClient.get<ArrayBuffer>(`/customers/${customerId}/photo`, { responseType: 'arraybuffer', timeout: 15000 })
    const type = String(res.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
    if (!ALLOWED_TYPES.includes(type)) return null
    return `data:${type};base64,${Buffer.from(res.data).toString('base64')}`
  } catch {
    return null
  }
}
