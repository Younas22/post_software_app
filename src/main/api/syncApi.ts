import { deviceClient } from './clients'
import type { ApiSuccessEnvelope } from '@shared/types'

export interface SyncBootstrapResponse {
  device: { id: number; name: string; status: string }
  business: { id: number; name: string; currency: string; timezone: string }
  branch: { id: number; name: string; address: string | null; phone: string | null }
  settings: Record<string, unknown>
  features: string[]
  payment_methods: Array<{ id: number; name: string; slug: string }>
  roles: Array<{ slug: string; name: string; permissions: string[] }>
  permissions: Array<{ id: number; slug: string; name: string }>
  server_time: string
}

export async function apiSyncBootstrap(): Promise<SyncBootstrapResponse> {
  const res = await deviceClient.get<ApiSuccessEnvelope<SyncBootstrapResponse>>('/sync/bootstrap')
  return res.data.data
}

export interface CursorPage<T> {
  data: T[]
  deleted_ids: number[]
  cursor: string
  synced_at: string
  meta: { current_page: number; per_page: number; total: number; last_page: number; has_more: boolean }
}

async function paginated<T>(path: string, since: string | null, page: number): Promise<CursorPage<T>> {
  const res = await deviceClient.get<ApiSuccessEnvelope<CursorPage<T>>>(path, {
    params: { since: since ?? undefined, per_page: 500, page }
  })
  return res.data.data
}

export const apiSyncCategories = <T>(since: string | null, page = 1): Promise<CursorPage<T>> =>
  paginated<T>('/sync/categories', since, page)
export const apiSyncBrands = <T>(since: string | null, page = 1): Promise<CursorPage<T>> =>
  paginated<T>('/sync/brands', since, page)
export const apiSyncProducts = <T>(since: string | null, page = 1): Promise<CursorPage<T>> =>
  paginated<T>('/sync/products', since, page)
export const apiSyncCustomers = <T>(since: string | null, page = 1): Promise<CursorPage<T>> =>
  paginated<T>('/sync/customers', since, page)
export const apiSyncInventory = <T>(since: string | null, page = 1): Promise<CursorPage<T>> =>
  paginated<T>('/sync/inventory', since, page)

export interface SyncSalePayload {
  client_transaction_id: string
  cashier_id: number
  customer_id?: number | null
  offline_created_at: string
  items: Array<{ product_id: number; quantity: number; discount?: number }>
  payments: Array<{ payment_method_id: number; amount: number; reference?: string }>
}

export interface SyncSaleResponse {
  status: string
  client_transaction_id: string
  server_id: number
  invoice_number: string
  receipt: unknown
}

export async function apiSyncPushSale(payload: SyncSalePayload): Promise<SyncSaleResponse> {
  const res = await deviceClient.post<ApiSuccessEnvelope<SyncSaleResponse>>('/sync/sales', payload)
  return res.data.data
}
