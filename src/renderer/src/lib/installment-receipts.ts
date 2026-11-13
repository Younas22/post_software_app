import urduRegular from '@renderer/assets/fonts/noto-nastaliq-urdu-400.woff2?inline'
import urduBold from '@renderer/assets/fonts/noto-nastaliq-urdu-700.woff2?inline'
import { remote } from '@renderer/lib/remote'
import { renderInstallmentReceiptHtml, type InstallmentReceiptData } from '@renderer/lib/installment-receipt-template'

/**
 * Desktop side of the installment recovery receipt. The template is the
 * same file as the web app's; the Urdu font is bundled into the app as a
 * data: URI, so the receipt renders and prints identically offline and in
 * the print engine's hidden window (which can't load app-relative files).
 *
 * Every receipt that is viewed is also cached in local SQLite settings, so
 * it can be reprinted while the device is offline.
 */

const FONTS = { urduRegular, urduBold }
const CACHE_PREFIX = 'installment_receipt:'
const INDEX_KEY = 'installment_receipts_index'
const MAX_CACHED = 100

export interface CachedReceiptRef {
  key: string
  planId: number
  paymentId: number
  receiptNo: string
  customer: string | null
  amount: string
  date: string | null
  cachedAt: string
}

function key(planId: number, paymentId: number): string {
  return `${planId}:${paymentId}`
}

async function readIndex(): Promise<CachedReceiptRef[]> {
  try {
    return JSON.parse((await window.pos.settings.get(INDEX_KEY)) ?? '[]') as CachedReceiptRef[]
  } catch {
    return []
  }
}

async function cache(planId: number, paymentId: number, data: InstallmentReceiptData): Promise<void> {
  const k = key(planId, paymentId)
  await window.pos.settings.set(CACHE_PREFIX + k, JSON.stringify(data))
  const index = (await readIndex()).filter((r) => r.key !== k)
  index.unshift({
    key: k,
    planId,
    paymentId,
    receiptNo: data.receipt.number,
    customer: data.customer.name,
    amount: data.money.installment_paid,
    date: data.receipt.installment_date,
    cachedAt: new Date().toISOString()
  })
  const dropped = index.splice(MAX_CACHED)
  await window.pos.settings.set(INDEX_KEY, JSON.stringify(index))
  // Old receipts beyond the cap: blank their payload (settings has no delete).
  for (const old of dropped) await window.pos.settings.set(CACHE_PREFIX + old.key, '')
}

/**
 * The receipt payload: from the server when online (and refreshes the
 * local copy), otherwise the locally cached copy. `offline` says which.
 */
export async function loadReceipt(planId: number, paymentId: number, online: boolean): Promise<{ data: InstallmentReceiptData; offline: boolean } | null> {
  if (online) {
    try {
      const { data } = await remote.get<InstallmentReceiptData>(`/installments/${planId}/payments/${paymentId}/receipt`)
      await cache(planId, paymentId, data)
      return { data, offline: false }
    } catch {
      // fall back to the cached copy below
    }
  }
  const raw = await window.pos.settings.get(CACHE_PREFIX + key(planId, paymentId))
  if (!raw) return null
  try {
    return { data: JSON.parse(raw) as InstallmentReceiptData, offline: true }
  } catch {
    return null
  }
}

export function receiptHtml(data: InstallmentReceiptData): string {
  return renderInstallmentReceiptHtml(data, FONTS)
}

/** Receipts available on this device without a connection (most recent first). */
export async function listCachedReceipts(): Promise<CachedReceiptRef[]> {
  return readIndex()
}
