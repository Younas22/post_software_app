import { userClient } from './clients'
import { ApiRequestError, normalizeAxiosError } from './httpClient'
import { scoped } from '../logging/logger'
import { redact } from '../logging/logger'
import type { RemoteRequestPayload, RemoteResponse } from '@shared/types'

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
  '/user'
]

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
