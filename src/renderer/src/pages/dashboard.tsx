import { useEffect, useState } from 'react'
import { DollarSign, ShoppingCart, AlertTriangle, Users, Wifi } from 'lucide-react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { Alert } from '@renderer/components/ui/alert'
import { remote } from '@renderer/lib/remote'
import { formatDateTime, formatMoney } from '@renderer/lib/format'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import type { LocalSale } from '@shared/types'

interface DashboardData {
  today: { sales_total: number; orders_count: number; expenses_total: number; estimated_profit: number }
  low_stock_count: number
  customers_count: number
  recent_sales: Array<{ id: number; invoice_number: string; total: number; sale_date: string; customer?: { name: string } | null }>
  top_products: Array<{ product_id: number; units_sold: number; revenue: number; product?: { name: string } | null }>
}

function StatCard({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string }): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function OfflineSummary(): React.JSX.Element {
  const [sales, setSales] = useState<LocalSale[] | null>(null)
  const branch = useAppStore((s) => s.branch)

  useEffect(() => {
    void window.pos.sales.list(200).then(setSales)
  }, [])

  const todayStr = new Date().toDateString()
  const todaySales = sales?.filter((s) => new Date(s.sale_date).toDateString() === todayStr) ?? []
  const total = todaySales.reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="space-y-4">
      <Alert variant="warning" title="Offline">
        Live business figures require an internet connection. Showing today's sales recorded on this device only —
        not the full picture across {branch?.name ?? 'your business'}.
      </Alert>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={DollarSign} label="Sales today (this device)" value={formatMoney(total)} />
        <StatCard icon={ShoppingCart} label="Orders today (this device)" value={String(todaySales.length)} />
        <StatCard icon={Wifi} label="Pending sync" value={String(todaySales.filter((s) => s.sync_status !== 'synced').length)} />
      </div>
    </div>
  )
}

export function DashboardPage(): React.JSX.Element {
  const online = useSyncStore((s) => s.online)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (online !== 'online') {
      setLoading(false)
      return
    }
    setLoading(true)
    remote
      .get<DashboardData>('/dashboard')
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [online])

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      {online !== 'online' ? (
        <OfflineSummary />
      ) : loading ? (
        <LoadingState />
      ) : !data ? (
        <EmptyState title="No dashboard data" description="This will populate once sales activity begins." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={DollarSign} label="Sales today" value={formatMoney(data.today.sales_total)} />
            <StatCard icon={ShoppingCart} label="Orders today" value={String(data.today.orders_count)} />
            <StatCard icon={AlertTriangle} label="Low stock items" value={String(data.low_stock_count)} />
            <StatCard icon={Users} label="Active customers" value={String(data.customers_count)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-sm font-semibold">Recent Sales</h2>
              {data.recent_sales.length === 0 ? (
                <EmptyState title="No sales yet" />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Invoice</TH>
                      <TH>Customer</TH>
                      <TH className="text-right">Total</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.recent_sales.map((s) => (
                      <TR key={s.id}>
                        <TD>
                          {s.invoice_number}
                          <div className="text-xs text-muted-foreground">{formatDateTime(s.sale_date)}</div>
                        </TD>
                        <TD>{s.customer?.name ?? 'Walk-in'}</TD>
                        <TD className="text-right">{formatMoney(s.total)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold">Top Products (30 days)</h2>
              {data.top_products.length === 0 ? (
                <EmptyState title="No sales yet" />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Product</TH>
                      <TH className="text-right">Units</TH>
                      <TH className="text-right">Revenue</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.top_products.map((p) => (
                      <TR key={p.product_id}>
                        <TD>{p.product?.name ?? `#${p.product_id}`}</TD>
                        <TD className="text-right">{p.units_sold}</TD>
                        <TD className="text-right">{formatMoney(p.revenue)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
