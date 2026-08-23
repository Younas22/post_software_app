import { getDb } from '../index'
import type { Category, Customer, PaymentMethod, Product } from '@shared/types'

/**
 * Read/write access to the server-authoritative catalog data cached
 * locally (categories, products, customers, payment methods, inventory
 * balances). These tables are populated exclusively by the sync engine
 * (Phase 05/06) — nothing in the renderer can write to them directly.
 */

export interface UpsertCategoryRow {
  id: number
  name: string
  slug: string
  status: string
  updated_at: string
}

export function upsertCategories(rows: UpsertCategoryRow[]): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO categories (id, name, slug, status, updated_at, deleted_at)
    VALUES (@id, @name, @slug, @status, @updated_at, NULL)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, slug=excluded.slug, status=excluded.status, updated_at=excluded.updated_at, deleted_at=NULL
  `)
  const tx = db.transaction((items: UpsertCategoryRow[]) => {
    for (const item of items) stmt.run(item)
  })
  tx(rows)
}

export function softDeleteCategories(ids: number[]): void {
  if (ids.length === 0) return
  const db = getDb()
  const now = new Date().toISOString()
  const stmt = db.prepare('UPDATE categories SET deleted_at = ? WHERE id = ?')
  const tx = db.transaction((idList: number[]) => {
    for (const id of idList) stmt.run(now, id)
  })
  tx(ids)
}

export interface UpsertProductRow {
  id: number
  category_id: number | null
  brand_id: number | null
  name: string
  sku: string | null
  barcode: string | null
  sale_price: number
  purchase_price: number
  tax_rate: number | null
  unit: string
  minimum_stock: number
  status: string
  image: string | null
  updated_at: string
}

export function upsertProducts(rows: UpsertProductRow[]): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO products (id, category_id, brand_id, name, sku, barcode, sale_price, purchase_price, tax_rate, unit, minimum_stock, status, image, updated_at, deleted_at)
    VALUES (@id, @category_id, @brand_id, @name, @sku, @barcode, @sale_price, @purchase_price, @tax_rate, @unit, @minimum_stock, @status, @image, @updated_at, NULL)
    ON CONFLICT(id) DO UPDATE SET
      category_id=excluded.category_id, brand_id=excluded.brand_id, name=excluded.name, sku=excluded.sku,
      barcode=excluded.barcode, sale_price=excluded.sale_price, purchase_price=excluded.purchase_price,
      tax_rate=excluded.tax_rate, unit=excluded.unit, minimum_stock=excluded.minimum_stock, status=excluded.status,
      image=excluded.image, updated_at=excluded.updated_at, deleted_at=NULL
  `)
  const tx = db.transaction((items: UpsertProductRow[]) => {
    for (const item of items) stmt.run(item)
  })
  tx(rows)
}

export function softDeleteProducts(ids: number[]): void {
  if (ids.length === 0) return
  const db = getDb()
  const now = new Date().toISOString()
  const stmt = db.prepare('UPDATE products SET deleted_at = ? WHERE id = ?')
  const tx = db.transaction((idList: number[]) => {
    for (const id of idList) stmt.run(now, id)
  })
  tx(ids)
}

export interface UpsertCustomerRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  status: string
  updated_at: string
}

export function upsertCustomers(rows: UpsertCustomerRow[]): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO customers (id, name, phone, email, address, status, updated_at, deleted_at)
    VALUES (@id, @name, @phone, @email, @address, @status, @updated_at, NULL)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address, status=excluded.status, updated_at=excluded.updated_at, deleted_at=NULL
  `)
  const tx = db.transaction((items: UpsertCustomerRow[]) => {
    for (const item of items) stmt.run(item)
  })
  tx(rows)
}

export function softDeleteCustomers(ids: number[]): void {
  if (ids.length === 0) return
  const db = getDb()
  const now = new Date().toISOString()
  const stmt = db.prepare('UPDATE customers SET deleted_at = ? WHERE id = ?')
  const tx = db.transaction((idList: number[]) => {
    for (const id of idList) stmt.run(now, id)
  })
  tx(ids)
}

export function replacePaymentMethods(rows: PaymentMethod[]): void {
  const db = getDb()
  const tx = db.transaction((items: PaymentMethod[]) => {
    db.prepare('DELETE FROM payment_methods').run()
    const stmt = db.prepare('INSERT INTO payment_methods (id, name, slug) VALUES (?, ?, ?)')
    for (const item of items) stmt.run(item.id, item.name, item.slug)
  })
  tx(rows)
}

export function listPaymentMethods(): PaymentMethod[] {
  return getDb().prepare('SELECT id, name, slug FROM payment_methods ORDER BY name').all() as PaymentMethod[]
}

export function upsertInventory(rows: Array<{ product_id: number; branch_id: number; quantity: number; updated_at: string }>): void {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO inventory (branch_id, product_id, quantity, updated_at)
    VALUES (@branch_id, @product_id, @quantity, @updated_at)
    ON CONFLICT(branch_id, product_id) DO UPDATE SET quantity=excluded.quantity, updated_at=excluded.updated_at
  `)
  const tx = db.transaction((items: typeof rows) => {
    for (const item of items) stmt.run(item)
  })
  tx(rows)
}

export function adjustInventoryLocally(branchId: number, productId: number, deltaQuantity: number): void {
  const db = getDb()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO inventory (branch_id, product_id, quantity, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(branch_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = excluded.updated_at
  `).run(branchId, productId, deltaQuantity, now)
}

export function searchProducts(branchId: number, query: string, limit = 50): Product[] {
  const db = getDb()
  const like = `%${query.trim()}%`
  const rows = db
    .prepare(
      `SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
       WHERE p.deleted_at IS NULL AND p.status = 'active'
         AND (p.name LIKE ? COLLATE NOCASE OR p.sku LIKE ? OR p.barcode LIKE ?)
       ORDER BY p.name COLLATE NOCASE
       LIMIT ?`
    )
    .all(branchId, like, like, like, limit) as Product[]
  return rows
}

export function getProductByBarcode(branchId: number, barcode: string): Product | null {
  const db = getDb()
  const row = db
    .prepare(
      `SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
       WHERE p.deleted_at IS NULL AND p.barcode = ?
       LIMIT 1`
    )
    .get(branchId, barcode) as Product | undefined
  return row ?? null
}

export function listCategories(): Category[] {
  return getDb()
    .prepare(`SELECT id, name, slug, status, updated_at FROM categories WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE`)
    .all() as Category[]
}

export function listCustomers(limit = 200): Customer[] {
  return getDb()
    .prepare(`SELECT id, name, phone, email, address, status, updated_at FROM customers WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE LIMIT ?`)
    .all(limit) as Customer[]
}

export function searchCustomers(query: string, limit = 50): Customer[] {
  const like = `%${query.trim()}%`
  return getDb()
    .prepare(
      `SELECT id, name, phone, email, address, status, updated_at FROM customers
       WHERE deleted_at IS NULL AND (name LIKE ? COLLATE NOCASE OR phone LIKE ?)
       ORDER BY name COLLATE NOCASE LIMIT ?`
    )
    .all(like, like, limit) as Customer[]
}

export function lowStockProducts(branchId: number): Array<Product & { stock_quantity: number }> {
  return getDb()
    .prepare(
      `SELECT p.*, COALESCE(i.quantity, 0) as stock_quantity
       FROM products p
       LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ?
       WHERE p.deleted_at IS NULL AND p.status = 'active' AND COALESCE(i.quantity, 0) <= p.minimum_stock
       ORDER BY p.name COLLATE NOCASE`
    )
    .all(branchId) as Array<Product & { stock_quantity: number }>
}
