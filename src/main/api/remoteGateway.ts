import { userClient } from './clients'
import { ApiRequestError, normalizeAxiosError } from './httpClient'
import { scoped } from '../logging/logger'
import { redact } from '../logging/logger'
import type { RemoteRequestPayload, RemoteResponse, RemoteUploadPayload } from '@shared/types'

const log = scoped('remote-gateway')

/**
 * Allow-listed path prefixes for the generic online-management passthrough
 * (Products/Categories/Brands CRUD, Inventory, Customers, Suppliers,
 * Purchases, Expenses, Sales history, Returns, Cash Sessions, Reports,
 * Employees, Branches, Business profile, Subscription, Payment Methods,
 * Notifications, Account). Every one of these is a real, documented
 * `/api/v1/*` endpoint (see docs/LARAVEL_API_DISCOVERY.md +
 * BACKEND_EXTENSIONS.md) — this is defense-in-depth on top of the fixed
 * base URL and server-side tenant scoping; it is not itself the security
 * boundary (Laravel is), but it stops the renderer from ever reaching an
 * unrelated host or an unexpected route even if it were compromised.
 */
const ALLOWED_PREFIXES = [
  '/dashboard',
  '/products',
  '/categories',
  '/brands',
  '/inventory',
  '/customers',
  '/suppliers',
  '/purchases',
  '/expenses',
  '/sales',
  '/returns',
  '/cash-sessions',
  '/reports',
  '/employees',
  '/branches',
  '/business',
  '/subscription',
  '/payment-methods',
  '/stock-movements',
  '/notifications',
  '/user',
  // Read-only bootstrap (settings values for the business settings screen).
  '/config',
  // Installment plans (business types with the `installments` module).
  '/installments',
  // The POS company's public profile & support contacts (login + Support page).
  '/public/platform'
]

/**
 * Multipart uploads are a much narrower surface than JSON requests: only
 * these exact endpoints, image files only, and a hard size cap.
 */
const UPLOAD_PATHS = ['/user/avatar', '/business']
/** Customer photo (installment onboarding) — /customers/{id}/photo. */
const UPLOAD_PATTERNS = [/^\/customers\/\d+\/photo$/]
const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

function isAllowed(path: string): boolean {
  if (!path.startsWith('/') || path.includes('..')) return false
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`))
}

export async function handleRemoteRequest<T = unknown>(req: RemoteRequestPayload): Promise<RemoteResponse<T>> {
  if (!isAllowed(req.path)) {
    log.warn('Blocked remote request to disallowed path', { path: req.path })
    return { ok: false, status: 400, message: 'This request path is not permitted.' }
  }

  try {
    const res = await userClient.request<{ success: boolean; message: string; data: T; meta?: unknown }>({
      method: req.method,
      url: req.path,
      data: req.body,
      params: req.params
    })
    return { ok: true, status: res.status, data: res.data.data, message: res.data.message, meta: (res.data as { meta?: RemoteResponse['meta'] }).meta }
  } catch (err) {
    const normalized = err instanceof ApiRequestError ? err : new ApiRequestError(normalizeAxiosError(err))
    log.error('Remote request failed', redact({ path: req.path, method: req.method, status: normalized.status }))
    return {
      ok: false,
      status: normalized.status,
      message: normalized.isNetworkError ? 'Unable to reach the server. You may be offline.' : normalized.message,
      errors: normalized.errors
    }
  }
}

/**
 * Sends a multipart form (profile photo, business logo/favicon) to one of
 * UPLOAD_PATHS. Laravel only parses multipart bodies on POST, so a "PUT"
 * resource update travels as POST + `_method=PUT` (set by the caller in
 * `fields`).
 */
export async function handleRemoteUpload<T = unknown>(req: RemoteUploadPayload): Promise<RemoteResponse<T>> {
  if (!UPLOAD_PATHS.includes(req.path) && !UPLOAD_PATTERNS.some((re) => re.test(req.path))) {
    log.warn('Blocked upload to disallowed path', { path: req.path })
    return { ok: false, status: 400, message: 'This upload is not permitted.' }
  }

  const form = new FormData()
  for (const [key, value] of Object.entries(req.fields ?? {})) form.append(key, value)
  for (const file of req.files) {
    const type = (file.type || '').toLowerCase()
    const isIco = /\.ico$/i.test(file.name)
    if (!UPLOAD_TYPES.includes(type) && !isIco) {
      return { ok: false, status: 422, message: 'Please choose an image file.', errors: { [file.field]: ['Please choose an image file.'] } }
    }
    if (file.data.byteLength > MAX_UPLOAD_BYTES) {
      return { ok: false, status: 422, message: 'The image is too large.', errors: { [file.field]: ['The image is too large.'] } }
    }
    form.append(file.field, new Blob([file.data], { type: type || 'image/x-icon' }), file.name)
  }

  try {
    const res = await userClient.post<{ success: boolean; message: string; data: T }>(req.path, form)
    return { ok: true, status: res.status, data: res.data.data, message: res.data.message }
  } catch (err) {
    const normalized = err instanceof ApiRequestError ? err : new ApiRequestError(normalizeAxiosError(err))
    log.error('Upload failed', redact({ path: req.path, status: normalized.status }))
    return {
      ok: false,
      status: normalized.status,
      message: normalized.isNetworkError ? 'Unable to reach the server. You may be offline.' : normalized.message,
      errors: normalized.errors
    }
  }
}
