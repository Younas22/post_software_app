import axios, { AxiosInstance, AxiosError } from 'axios'
import { getSetting, setSetting } from '../db/repositories/syncMetaRepo'
import { scoped } from '../logging/logger'
import { redact } from '../logging/logger'

const log = scoped('api')

const DEFAULT_BASE_URL = 'http://localhost/post_software/api/v1'
const BASE_URL_SETTING_KEY = 'api_base_url'

/**
 * The base URL is configurable (Settings > Connection) but always resolves
 * to a single trusted value chosen by an authenticated operator — never
 * something the renderer can override per-request. This is what makes the
 * RemoteRequest IPC gateway safe: the renderer picks a relative API path,
 * main always sends it to the one configured Laravel instance.
 */
export function getApiBaseUrl(): string {
  try {
    return getSetting(BASE_URL_SETTING_KEY) ?? DEFAULT_BASE_URL
  } catch {
    // DB not ready yet (very first launch, before migrations run) — fall
    // back to the default rather than throwing during app boot.
    return DEFAULT_BASE_URL
  }
}

export function setApiBaseUrl(url: string): void {
  setSetting(BASE_URL_SETTING_KEY, url.replace(/\/+$/, ''))
}

export interface NormalizedApiError {
  status: number
  message: string
  errors: Record<string, string[]>
  errorType?: 'retryable' | 'non_retryable' | 'conflict'
  isNetworkError: boolean
}

export class ApiRequestError extends Error {
  status: number
  errors: Record<string, string[]>
  errorType?: 'retryable' | 'non_retryable' | 'conflict'
  isNetworkError: boolean

  constructor(normalized: NormalizedApiError) {
    super(normalized.message)
    this.name = 'ApiRequestError'
    this.status = normalized.status
    this.errors = normalized.errors
    this.errorType = normalized.errorType
    this.isNetworkError = normalized.isNetworkError
  }
}

export function normalizeAxiosError(err: unknown): NormalizedApiError {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{
      message?: string
      errors?: Record<string, string[]>
      error_type?: 'retryable' | 'non_retryable' | 'conflict'
    }>

    if (!axiosErr.response) {
      return {
        status: 0,
        message: axiosErr.code === 'ECONNABORTED' ? 'Request timed out.' : 'Unable to reach the server.',
        errors: {},
        isNetworkError: true
      }
    }

    const body = axiosErr.response.data
    return {
      status: axiosErr.response.status,
      message: body?.message ?? 'Server error. Please try again later.',
      errors: body?.errors ?? {},
      errorType: body?.error_type,
      isNetworkError: false
    }
  }

  return {
    status: 0,
    message: err instanceof Error ? err.message : 'Unknown error.',
    errors: {},
    isNetworkError: true
  }
}

/** One axios instance per token type (user session vs. device credential). */
export function createApiClient(tokenProvider: () => string | null): AxiosInstance {
  const instance = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 20000,
    headers: { Accept: 'application/json' }
  })

  instance.interceptors.request.use((config) => {
    // Base URL can change at runtime (Settings > Connection) without an app
    // restart, so it's re-read on every request rather than baked in once.
    config.baseURL = getApiBaseUrl()
    const token = tokenProvider()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const normalized = normalizeAxiosError(error)
      log.error('API request failed', redact({ url: error?.config?.url, method: error?.config?.method, ...normalized }))
      return Promise.reject(new ApiRequestError(normalized))
    }
  )

  return instance
}
