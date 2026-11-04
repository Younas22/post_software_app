let cachedCurrency = 'USD'

export function setFormatCurrency(currency: string): void {
  cachedCurrency = currency || 'USD'
}

/** The business's timezone — every date/time is shown in it, not the PC's own clock zone. */
let cachedTimeZone: string | undefined

export function setFormatTimeZone(timeZone: string | null | undefined): void {
  if (!timeZone) {
    cachedTimeZone = undefined
    return
  }
  try {
    new Intl.DateTimeFormat(undefined, { timeZone })
    cachedTimeZone = timeZone
  } catch {
    cachedTimeZone = undefined
  }
}

/** A bare calendar date ("2026-11-03") isn't an instant — render it in UTC so the day never shifts. */
function zoneFor(value: string | Date): string | undefined {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : cachedTimeZone
}

export function formatMoney(amount: number, currency = cachedCurrency): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: zoneFor(value) }).format(date)
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: zoneFor(value) }).format(date)
}

export function formatRelativeTime(value: string | Date | null): string {
  if (!value) return 'never'
  const date = typeof value === 'string' ? new Date(value) : value
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}
