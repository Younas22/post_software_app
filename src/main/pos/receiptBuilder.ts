import { getDb } from '../db'
import { getCachedBranch, getCachedBusiness } from '../db/repositories/contextRepo'
import { sessionManager } from '../auth/sessionManager'
import type { LocalSale, Receipt } from '@shared/types'

function lookupCustomerName(customerId: number | null): { name: string } | null {
  if (!customerId) return null
  const row = getDb().prepare('SELECT name FROM customers WHERE id = ?').get(customerId) as { name: string } | undefined
  return row ? { name: row.name } : null
}

export function buildReceiptFromLocalSale(sale: LocalSale): Receipt {
  const business = getCachedBusiness()
  const branch = getCachedBranch()
  const user = sessionManager.getCurrentUser()

  return {
    invoice_number: sale.invoice_number ?? `OFFLINE-${sale.local_id.slice(0, 8).toUpperCase()}`,
    business: business ? { name: business.name, logo_data: business.logo_data ?? null, timezone: business.timezone } : undefined,
    branch: { name: branch?.name ?? '', address: branch?.address ?? null, phone: branch?.phone ?? null },
    cashier: { name: user?.name ?? 'Unknown' },
    customer: lookupCustomerName(sale.customer_id),
    items: sale.items.map((i) => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      discount: i.discount,
      tax: i.tax,
      line_total: i.line_total
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    total: sale.total,
    payments: sale.payments,
    sale_date: sale.sale_date,
    is_offline: sale.sync_status !== 'synced'
  }
}
