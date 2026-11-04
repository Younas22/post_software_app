import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import { adjustInventoryLocally } from './catalogRepo'
import type { CreateSaleInput, LocalSale, PaymentInput, SaleSyncStatus } from '@shared/types'

interface ProductPriceRow {
  id: number
  name: string
  type: string | null
  sale_price: number
  tax_rate: number | null
}

export class DuplicateSaleError extends Error {
  constructor(public readonly existing: LocalSale) {
    super('A sale with this client_transaction_id already exists locally.')
    this.name = 'DuplicateSaleError'
  }
}

export class InsufficientStockError extends Error {
  constructor(
    public readonly productName: string,
    public readonly available: number,
    public readonly requested: number
  ) {
    super(`Insufficient stock for ${productName}: ${available} available, ${requested} requested.`)
    this.name = 'InsufficientStockError'
  }
}

/**
 * Creates a sale entirely offline-first (Phase 07): local pricing is taken
 * from the last-synced product cache (never trusted as final — the server
 * remains authoritative and re-prices on sync, per the handoff doc's
 * "server-authoritative pricing" rule; this is only what lets a cashier see
 * a correct total *before* connectivity returns), local inventory is
 * deducted immediately so the next sale sees accurate stock, and a
 * sync_queue row is written in the SAME transaction so a crash between
 * "sale saved" and "queued for sync" can never happen.
 *
 * Idempotent on client_transaction_id — calling this twice with the same id
 * (e.g. a UI retry after a transient local error) returns the original sale
 * instead of creating a second one.
 */
export function createLocalSale(input: CreateSaleInput, cashierId: number, allowNegativeStock = false): LocalSale {
  const db = getDb()

  const existing = findByClientTransactionId(input.client_transaction_id)
  if (existing) {
    throw new DuplicateSaleError(existing)
  }

  const run = db.transaction((): LocalSale => {
    const localId = randomUUID()
    const now = new Date().toISOString()

    const priceStmt = db.prepare('SELECT id, name, type, sale_price, tax_rate FROM products WHERE id = ?')
    const stockStmt = db.prepare('SELECT quantity FROM inventory WHERE branch_id = ? AND product_id = ?')

    const serviceIds = new Set<number>()
    let subtotal = 0
    let totalTax = 0
    let totalDiscount = 0
    const lineItems: LocalSale['items'] = []

    for (const item of input.items) {
      const product = priceStmt.get(item.product_id) as ProductPriceRow | undefined
      if (!product) {
        throw new Error(`Product ${item.product_id} not found in local catalog.`)
      }

      // Services carry no stock (same rule as the server's SaleService).
      const isService = product.type === 'service'
      if (isService) serviceIds.add(product.id)

      if (!allowNegativeStock && !isService) {
        const stockRow = stockStmt.get(input.branch_id, item.product_id) as { quantity: number } | undefined
        const available = stockRow?.quantity ?? 0
        if (available < item.quantity) {
          throw new InsufficientStockError(product.name, available, item.quantity)
        }
      }

      const discount = item.discount ?? 0
      const lineSubtotal = product.sale_price * item.quantity - discount
      const taxRate = product.tax_rate ?? 0
      const lineTax = Math.max(lineSubtotal, 0) * (taxRate / 100)
      const lineTotal = lineSubtotal + lineTax

      subtotal += product.sale_price * item.quantity
      totalDiscount += discount
      totalTax += lineTax

      lineItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.sale_price,
        discount,
        tax: lineTax,
        line_total: lineTotal
      })
    }

    const total = subtotal - totalDiscount + totalTax

    db.prepare(
      `INSERT INTO sales (local_id, server_id, invoice_number, client_transaction_id, branch_id, customer_id, cashier_id, subtotal, discount, tax, total, sync_status, sale_date, created_at, updated_at)
       VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
    ).run(
      localId,
      input.client_transaction_id,
      input.branch_id,
      input.customer_id ?? null,
      cashierId,
      subtotal,
      totalDiscount,
      totalTax,
      total,
      now,
      now,
      now
    )

    const itemStmt = db.prepare(
      `INSERT INTO sale_items (sale_local_id, product_id, product_name, quantity, unit_price, discount, tax, line_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const li of lineItems) {
      itemStmt.run(localId, li.product_id, li.product_name, li.quantity, li.unit_price, li.discount, li.tax, li.line_total)
      if (!serviceIds.has(li.product_id)) adjustInventoryLocally(input.branch_id, li.product_id, -li.quantity)
    }

    const paymentStmt = db.prepare(
      `INSERT INTO payments (sale_local_id, payment_method_id, amount, reference) VALUES (?, ?, ?, ?)`
    )
    for (const p of input.payments) {
      paymentStmt.run(localId, p.payment_method_id, p.amount, p.reference ?? null)
    }

    db.prepare(
      `INSERT INTO sync_queue (operation_id, entity, action, local_id, payload, created_at, status, attempts, last_error)
       VALUES (?, 'sale', 'create', ?, ?, ?, 'pending', 0, NULL)`
    ).run(randomUUID(), localId, JSON.stringify({ ...input, cashier_id: cashierId, offline_created_at: now }), now)

    return getByLocalId(localId)!
  })

  return run()
}

export function findByClientTransactionId(clientTransactionId: string): LocalSale | null {
  const row = getDb()
    .prepare('SELECT local_id FROM sales WHERE client_transaction_id = ?')
    .get(clientTransactionId) as { local_id: string } | undefined
  return row ? getByLocalId(row.local_id) : null
}

export function getByLocalId(localId: string): LocalSale | null {
  const db = getDb()
  const sale = db.prepare('SELECT * FROM sales WHERE local_id = ?').get(localId) as
    | (Omit<LocalSale, 'items' | 'payments'> & Record<string, unknown>)
    | undefined
  if (!sale) return null

  const items = db
    .prepare('SELECT product_id, product_name, quantity, unit_price, discount, tax, line_total FROM sale_items WHERE sale_local_id = ?')
    .all(localId) as LocalSale['items']
  const payments = db
    .prepare('SELECT payment_method_id, amount, reference FROM payments WHERE sale_local_id = ?')
    .all(localId) as PaymentInput[]

  return {
    local_id: sale.local_id as string,
    server_id: (sale.server_id as number | null) ?? null,
    invoice_number: (sale.invoice_number as string | null) ?? null,
    client_transaction_id: sale.client_transaction_id as string,
    branch_id: sale.branch_id as number,
    customer_id: (sale.customer_id as number | null) ?? null,
    cashier_id: sale.cashier_id as number,
    items,
    payments,
    subtotal: sale.subtotal as number,
    discount: sale.discount as number,
    tax: sale.tax as number,
    total: sale.total as number,
    sync_status: sale.sync_status as SaleSyncStatus,
    sale_date: sale.sale_date as string,
    created_at: sale.created_at as string
  }
}

export function listSales(branchId: number, limit = 100): LocalSale[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT local_id FROM sales WHERE branch_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(branchId, limit) as Array<{ local_id: string }>
  return rows.map((r) => getByLocalId(r.local_id)!).filter(Boolean)
}

export function markSaleSynced(localId: string, serverId: number, invoiceNumber: string): void {
  getDb()
    .prepare(`UPDATE sales SET server_id = ?, invoice_number = ?, sync_status = 'synced', updated_at = ? WHERE local_id = ?`)
    .run(serverId, invoiceNumber, new Date().toISOString(), localId)
}

export function updateSaleSyncStatus(localId: string, status: SaleSyncStatus): void {
  getDb().prepare('UPDATE sales SET sync_status = ?, updated_at = ? WHERE local_id = ?').run(status, new Date().toISOString(), localId)
}
