import log from 'electron-log/main'
import { app } from 'electron'
import path from 'node:path'

/**
 * Structured local logging (Master spec: "Maintain structured local logs for
 * sync errors, printer errors, device errors, API errors, database errors.
 * Never expose sensitive credentials in logs.").
 *
 * electron-log writes to a rotating file under the OS user-data/log
 * directory and mirrors to the console in dev. Every call site MUST use a
 * scope (log.scope('sync') etc.) so DEVELOPMENT_PROGRESS.md-era debugging
 * and the in-app "Open Logs Folder" action can find things quickly.
 */
log.initialize()
log.transports.file.level = 'info'
log.transports.file.maxSize = 5 * 1024 * 1024
log.transports.console.level = app.isPackaged ? false : 'debug'
log.transports.file.resolvePathFn = (): string =>
  path.join(app.getPath('userData'), 'logs', 'pos-desktop.log')

/** Recursively strips well-known sensitive keys before anything is logged. */
export function redact(value: unknown): unknown {
  const SENSITIVE_KEYS = new Set([
    'token',
    'password',
    'authorization',
    'bearer',
    'device_token',
    'access_token',
    'client_secret'
  ])

  const walk = (input: unknown, depth: number): unknown => {
    if (depth > 6 || input === null || input === undefined) return input
    if (Array.isArray(input)) return input.map((v) => walk(v, depth + 1))
    if (typeof input === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
        out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : walk(v, depth + 1)
      }
      return out
    }
    return input
  }

  return walk(value, 0)
}

export function scoped(scope: string): ReturnType<typeof log.scope> {
  return log.scope(scope)
}

export default log
