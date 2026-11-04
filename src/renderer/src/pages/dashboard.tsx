import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, ShoppingCart, AlertTriangle, Users, Wifi, Receipt, TrendingUp, CalendarClock, Plus, UserPlus, PackagePlus } from 'lucide-react'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { Alert } from '@renderer/components/ui/alert'
import { StatCard } from '@renderer/components/ui/stat-card'
import { InstallmentsDashboardCard } from '@renderer/components/installments/installments-dashboard-card'
import { remote } from '@renderer/lib/remote'
import { formatDate, formatDateTime, formatMoney } from '@renderer/lib/format'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useBranding } from '@renderer/lib/use-branding'
import { PERMISSIONS } from '@renderer/lib/navPermissions'
import { cn } from '@renderer/lib/cn'
import type { LocalSale } from '@shared/types'

interface DashboardData {
  today: { sales_total: number; orders_count: number; expenses_total: number; estimated_profit: number }
  low_stock_count: number
  customers_count: number
  recent_sales: Array<{ id: number; invoice_number: string; total: number; sale_date: string; customer?: { name: string } | null }>
  top_products: Array<{ product_id: number; units_sold: number; revenue: number; product?: { name: string } | null }>
}

function OfflineSummary(): React.JSX.Element {
  const [sales, setSales] = useState<LocalSale[] | null>(null)
  const branch = useAppStore((s) => s.branch)
  const { terms } = useBranding()

  useEffect(() => {
    void window.pos.sales.list(200).then(setSales)
  }, [])

  const todayStr = new Date().toDateString()
  const todaySales = sales?.filter((s) => new Date(s.sale_date).toDateString() === todayStr) ?? []
  const total = todaySales.reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="space-y-4">
      <Alert variant="warning" title="Offline">
        Live business figures require an internet connection. Showing today&apos;s {terms.sales.toLowerCase()} recorded on this
        device only — not the full picture across {branch?.name ?? 'your business'}.
      </Alert>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={DollarSign} tone="brand" label="Revenue today (this device)" value={formatMoney(total)} />
        <StatCard icon={ShoppingCart} label={`${terms.sales} today (this device)`} value={String(todaySales.length)} />
        <StatCard icon={Wifi} tone="warning" label="Pending sync" value={String(todaySales.filter((s) => s.sync_status !== 'synced').length)} />
      </div>
    </div>
  )
}

export function DashboardPage(): React.JSX.Element {
  const online = useSyncStore((s) => s.online)
  const user = useAuthStore((s) => s.user)
  const { hasPermission } = useAuthStore()
  const { hasFeature } = useAppStore()
  const business = useAppStore((s) => s.business)
  const { terms, typeName, hasModule, isHidden } = useBranding()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const showStock = !isHidden('inventory')

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

  const quick = [
    hasModule('installments') && hasPermission(PERMISSIONS.installmentsCreate) && { to: '/installments/new', icon: CalendarClock, label: 'New plan', primary: true },
    hasPermission(PERMISSIONS.salesCreate) && hasFeature('pos') && { to: '/pos', icon: Plus, label: terms.pos, primary: !hasModule('installments') },
    hasPermission(PERMISSIONS.customersCreate) && { to: '/customers', icon: UserPlus, label: terms.customers, primary: false },
    hasPermission(PERMISSIONS.productsCreate) && { to: '/products', icon: PackagePlus, label: terms.products, primary: false }
  ].filter(Boolean) as Array<{ to: string; icon: typeof Plus; label: string; primary: boolean }>

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-2xl bg-brand p-7 text-brand-foreground shadow-sm">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full border-[36px] border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 right-40 size-56 rounded-full bg-white/5" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium opacity-80">{formatDate(new Date())}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Welcome back, {user?.name?.split(' ')[0]}</h1>
            <p className="mt-1 text-sm opacity-85">
              {business?.name}
              {typeName ? ` · ${typeName}` : ''} — here&apos;s your business today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q.to}
                onClick={() => navigate(q.to)}
                className={cn(
                  'inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors',
                  q.primary ? 'bg-white text-[var(--brand-deep,#006b37)] shadow-sm hover:bg-white/90' : 'bg-white/15 ring-1 ring-white/25 hover:bg-white/25'
                )}
              >
                <q.icon className="size-[18px]" /> {q.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {online !== 'online' ? (
        <OfflineSummary />
      ) : loading ? (
        <LoadingState />
      ) : !data ? (
        <EmptyState title="No dashboard data" description={`This will populate once ${terms.sales.toLowerCase()} activity begins.`} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
            <StatCard icon={DollarSign} tone="brand" label="Today's Revenue" value={formatMoney(data.today.sales_total)} />
            <StatCard icon={ShoppingCart} label={`Today's ${terms.sales}`} value={String(data.today.orders_count)} />
            {showStock && (
              <StatCard
                icon={AlertTriangle}
                tone={data.low_stock_count > 0 ? 'warning' : 'default'}
                label="Low Stock"
                value={String(data.low_stock_count)}
              />
            )}
            <StatCard icon={Users} label={terms.customers} value={String(data.customers_count)} />
            <StatCard icon={Receipt} label="Today's Expenses" value={formatMoney(data.today.expenses_total ?? 0)} />
            <StatCard
              icon={TrendingUp}
              tone={(data.today.estimated_profit ?? 0) >= 0 ? 'success' : 'error'}
              label="Est. Profit"
              value={formatMoney(data.today.estimated_profit ?? 0)}
            />
          </div>

          {hasModule('installments') && hasPermission(PERMISSIONS.installmentsView) && <InstallmentsDashboardCard />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">Recent {terms.sales.toLowerCase()}</h2>
              {data.recent_sales.length === 0 ? (
                <EmptyState title={`No ${terms.sales.toLowerCase()} yet`} />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Invoice</TH>
                      <TH>{terms.customer}</TH>
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
                        <TD className="text-right">{formatMoney(Number(s.total))}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-base font-semibold">Top {terms.products.toLowerCase()} (30 days)</h2>
              {data.top_products.length === 0 ? (
                <EmptyState title={`No ${terms.product.toLowerCase()} sales yet`} />
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>{terms.product}</TH>
                      <TH className="text-right">Units</TH>
                      <TH className="text-right">Revenue</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.top_products.map((p) => (
                      <TR key={p.product_id}>
                        <TD>{p.product?.name ?? `#${p.product_id}`}</TD>
                        <TD className="text-right">{p.units_sold}</TD>
                        <TD className="text-right">{formatMoney(Number(p.revenue))}</TD>
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
