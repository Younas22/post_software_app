import type { PaginationMeta, RemoteResponse } from '@shared/types'

export class RemoteError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'RemoteError'
    this.status = status
    this.errors = errors
  }

  /** First validation message for a field, if any — convenient for inline form errors. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

async function call<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>
): Promise<{ data: T; meta?: PaginationMeta; message?: string }> {
  const res: RemoteResponse<T> = await window.pos.remote.request({ method, path, body, params })
  if (!res.ok) {
    throw new RemoteError(res.message ?? 'Request failed.', res.status, res.errors ?? {})
  }
  return { data: res.data as T, meta: res.meta, message: res.message }
}

export const remote = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) => call<T>('GET', path, undefined, params),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => call<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
  delete: <T>(path: string) => call<T>('DELETE', path)
}
