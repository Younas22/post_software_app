import { useEffect, useState } from 'react'
import { Tabs } from '@renderer/components/ui/tabs'
import { Input } from '@renderer/components/ui/input'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { Pagination } from '@renderer/components/ui/pagination'
import { remote } from '@renderer/lib/remote'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { toast } from '@renderer/lib/stores/toastStore'
import type { PaginationMeta } from '@shared/types'

const REPORT_TABS = [
  { value: 'sales', label: 'Sales' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'products', label: 'Products' },
  { value: 'customers', label: 'Customers' },
  { value: 'profit', label: 'Profit' },
  { value: 'expenses', label: 'Expenses' }
] as const

type ReportTab = (typeof REPORT_TABS)[number]['value']

function StatCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export function ReportsPage(): React.JSX.Element {
  const [tab, setTab] = useState<ReportTab>('sales')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    setLoading(true)
    setPage(1)
  }, [tab, dateFrom, dateTo])

  useEffect(() => {
    setLoading(true)
    remote
      .get<Record<string, unknown>>(`/reports/${tab}`, {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page
      })
      .then(({ data: d }) => setData(d))
      .catch((err) => {
        setData(null)
        toast({ variant: 'error', title: 'Report failed', description: err instanceof Error ? err.message : undefined })
      })
      .finally(() => setLoading(false))
  }, [tab, dateFrom, dateTo, page])

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Business performance, computed server-side from your real transaction history.</p>
      </div>

      <Tabs items={[...REPORT_TABS]} value={tab} onChange={(v) => setTab(v as ReportTab)} />

      <div className="flex items-center gap-2">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">to</span>
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>

      {loading ? <LoadingState /> : !data ? <EmptyState title="No data" /> : <ReportBody tab={tab} data={data} onPageChange={setPage} />}
    </div>
  )
}

interface Paginated<T> {
  data: T[]
  meta?: PaginationMeta
  current_page?: number
  last_page?: number
  total?: number
  from?: number | null
  to?: number | null
  per_page?: number
}

function toMeta(p: Paginated<unknown> | undefined): PaginationMeta | null {
  if (!p || p.current_page === undefined) return null
  return {
    current_page: p.current_page ?? 1,
    per_page: p.per_page ?? 15,
    total: p.total ?? 0,
    last_page: p.last_page ?? 1,
    from: p.from ?? null,
    to: p.to ?? null
  }
}

function ReportBody({ tab, data, onPageChange }: { tab: ReportTab; data: Record<string, unknown>; onPageChange: (p: number) => void }): React.JSX.Element {
  if (tab === 'sales') {
    const summary = data.summary as { transaction_count: number; subtotal: number; discount: number; tax: number; total: number }
    const sales = data.sales as Paginated<{ id: number; invoice_number: string; sale_date: string; total: number; customer?: { name: string } | null; user?: { name: string } | null }>
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Transactions" value={String(summary.transaction_count)} />
          <StatCard label="Subtotal" value={formatMoney(summary.subtotal)} />
          <StatCard label="Discount" value={formatMoney(summary.discount)} />
          <StatCard label="Tax" value={formatMoney(summary.tax)} />
          <StatCard label="Total" value={formatMoney(summary.total)} />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Date</TH>
              <TH>Customer</TH>
              <TH>Cashier</TH>
              <TH className="text-right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {sales.data.map((s) => (
              <TR key={s.id}>
                <TD>{s.invoice_number}</TD>
                <TD>{formatDate(s.sale_date)}</TD>
                <TD>{s.customer?.name ?? 'Walk-in'}</TD>
                <TD>{s.user?.name ?? '—'}</TD>
                <TD className="text-right">{formatMoney(s.total)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {toMeta(sales) && <Pagination meta={toMeta(sales)!} onPageChange={onPageChange} />}
      </>
    )
  }

  if (tab === 'purchases') {
    const summary = data.summary as { purchase_count: number; total: number }
    const purchases = data.purchases as Paginated<{ id: number; invoice_reference: string | null; purchase_date: string; total: number; supplier?: { name: string } | null }>
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          <StatCard label="Purchases" value={String(summary.purchase_count)} />
          <StatCard label="Total" value={formatMoney(summary.total)} />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Reference</TH>
              <TH>Date</TH>
              <TH>Supplier</TH>
              <TH className="text-right">Total</TH>
            </TR>
          </THead>
          <TBody>
            {purchases.data.map((p) => (
              <TR key={p.id}>
                <TD>{p.invoice_reference ?? `#${p.id}`}</TD>
                <TD>{formatDate(p.purchase_date)}</TD>
                <TD>{p.supplier?.name ?? '—'}</TD>
                <TD className="text-right">{formatMoney(p.total)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {toMeta(purchases) && <Pagination meta={toMeta(purchases)!} onPageChange={onPageChange} />}
      </>
    )
  }

  if (tab === 'inventory') {
    const summary = data.summary as { total_units: number; stock_value: number; low_stock_count: number; out_of_stock_count: number }
    const inventory = data.inventory as Paginated<{ product_id: number; quantity: number; product?: { name: string; sku: string | null } | null; branch?: { name: string } | null }>
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total units" value={String(summary.total_units)} />
          <StatCard label="Stock value" value={formatMoney(summary.stock_value)} />
          <StatCard label="Low stock" value={String(summary.low_stock_count)} />
          <StatCard label="Out of stock" value={String(summary.out_of_stock_count)} />
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>Branch</TH>
              <TH className="text-right">Quantity</TH>
            </TR>
          </THead>
          <TBody>
            {inventory.data.map((row, i) => (
              <TR key={i}>
                <TD>{row.product?.name ?? '—'}</TD>
                <TD>{row.branch?.name ?? '—'}</TD>
                <TD className="text-right">{row.quantity}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {toMeta(inventory) && <Pagination meta={toMeta(inventory)!} onPageChange={onPageChange} />}
      </>
    )
  }

  if (tab === 'products') {
    const products = data.products as Paginated<{ product_id: number; quantity_sold: number; revenue: number; product?: { name: string; sku: string | null } | null }>
    return (
      <>
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH className="text-right">Qty sold</TH>
              <TH className="text-right">Revenue</TH>
            </TR>
          </THead>
          <TBody>
            {products.data.map((row) => (
              <TR key={row.product_id}>
                <TD>{row.product?.name ?? `#${row.product_id}`}</TD>
                <TD className="text-right">{row.quantity_sold}</TD>
                <TD className="text-right">{formatMoney(row.revenue)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {toMeta(products) && <Pagination meta={toMeta(products)!} onPageChange={onPageChange} />}
      </>
    )
  }

  if (tab === 'customers') {
    const customers = data.customers as Paginated<{ customer_id: number; transaction_count: number; total_spent: number; customer?: { name: string; phone: string | null } | null }>
    return (
      <>
        <Table>
          <THead>
            <TR>
              <TH>Customer</TH>
              <TH className="text-right">Transactions</TH>
              <TH className="text-right">Total spent</TH>
            </TR>
          </THead>
          <TBody>
            {customers.data.map((row) => (
              <TR key={row.customer_id}>
                <TD>{row.customer?.name ?? `#${row.customer_id}`}</TD>
                <TD className="text-right">{row.transaction_count}</TD>
                <TD className="text-right">{formatMoney(row.total_spent)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        {toMeta(customers) && <Pagination meta={toMeta(customers)!} onPageChange={onPageChange} />}
      </>
    )
  }

  if (tab === 'profit') {
    const profit = data as unknown as { revenue: number; estimated_cost: number; estimated_gross_profit: number }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Revenue" value={formatMoney(profit.revenue)} />
        <StatCard label="Estimated cost" value={formatMoney(profit.estimated_cost)} />
        <StatCard label="Estimated gross profit" value={formatMoney(profit.estimated_gross_profit)} />
      </div>
    )
  }

  // expenses
  const summary = data.summary as { expense_count: number; total: number } | undefined
  const expenses = data.expenses as Paginated<{ id: number; title: string; category: string; amount: number; expense_date: string }> | undefined
  if (!summary || !expenses) return <EmptyState title="No data" />
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <StatCard label="Expenses" value={String(summary.expense_count)} />
        <StatCard label="Total" value={formatMoney(summary.total)} />
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Title</TH>
            <TH>Category</TH>
            <TH>Date</TH>
            <TH className="text-right">Amount</TH>
          </TR>
        </THead>
        <TBody>
          {expenses.data.map((e) => (
            <TR key={e.id}>
              <TD>{e.title}</TD>
              <TD>{e.category}</TD>
              <TD>{formatDate(e.expense_date)}</TD>
              <TD className="text-right">{formatMoney(e.amount)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {toMeta(expenses) && <Pagination meta={toMeta(expenses)!} onPageChange={onPageChange} />}
    </>
  )
}
