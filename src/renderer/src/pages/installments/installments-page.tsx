import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, HandCoins, Plus, Wallet } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { SearchInput } from '@renderer/components/ui/search-input'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { TableSkeleton } from '@renderer/components/ui/loading-state'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { Pagination } from '@renderer/components/ui/pagination'
import { StatCard } from '@renderer/components/ui/stat-card'
import { InstallmentsGate, InstallmentStatusBadge, PageHeader, ProgressBar } from '@renderer/components/installments/installment-ui'
import { remote } from '@renderer/lib/remote'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useTerms } from '@renderer/lib/use-branding'
import { PERMISSIONS } from '@renderer/lib/navPermissions'
import { cn } from '@renderer/lib/cn'
import { daysFromToday, relativeDue, type InstallmentPlan, type InstallmentSummary } from '@renderer/lib/installments'
import type { PaginationMeta } from '@shared/types'

const TABS = [
  { value: '', label: 'All plans' },
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

export function InstallmentsPage(): React.JSX.Element {
  return (
    <InstallmentsGate>
      <PlansList />
    </InstallmentsGate>
  )
}

function PlansList(): React.JSX.Element {
  const navigate = useNavigate()
  const terms = useTerms()
  const canCreate = useAuthStore((s) => s.hasPermission(PERMISSIONS.installmentsCreate))
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<InstallmentPlan[]>([])
  const [meta, setMeta] = useState<PaginationMeta | undefined>()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<InstallmentSummary | null>(null)

  useEffect(() => {
    void remote
      .get<InstallmentSummary>('/installments/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setSummary(null))
  }, [])

  useEffect(() => {
    setLoading(true)
    remote
      .get<InstallmentPlan[]>('/installments', { status: status || undefined, search: search || undefined, page, per_page: 15 })
      .then(({ data, meta: m }) => {
        setRows(data)
        setMeta(m)
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [status, search, page])

  const s = summary

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Installment Plans"
        subtitle={`Every ${terms.product.toLowerCase()} sold on installments, with what's paid and what's due.`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/collections')}>
              <HandCoins className="size-4" /> Collections
            </Button>
            {canCreate && (
              <Button onClick={() => navigate('/installments/new')}>
                <Plus className="size-4" /> New plan
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Active plans" value={String(s?.active_count ?? 0)} icon={CalendarClock} tone="brand" loading={!s} hint={s ? `${s.completed_count} completed` : undefined} />
        <StatCard label="Outstanding" value={formatMoney(Number(s?.outstanding ?? 0))} icon={Wallet} loading={!s} hint="Still to be collected" />
        <StatCard
          label="Overdue"
          value={formatMoney(Number(s?.overdue_amount ?? 0))}
          icon={AlertTriangle}
          tone={s && Number(s.overdue_amount) > 0 ? 'error' : 'default'}
          loading={!s}
          hint={s ? `${s.overdue_plans} plan${s.overdue_plans === 1 ? '' : 's'} late` : undefined}
        />
        <StatCard
          label="Collected this month"
          value={formatMoney(Number(s?.collected_this_month ?? 0))}
          icon={HandCoins}
          tone="success"
          loading={!s}
          hint={s ? `${formatMoney(Number(s.collected_today))} today` : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value)
                setPage(1)
              }}
              className={cn(
                'h-10 rounded-xl px-4 text-sm font-medium transition-colors',
                status === tab.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-card hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SearchInput
          className="w-80"
          placeholder={`Search plan no., ${terms.customer.toLowerCase()} or phone…`}
          onSearch={(v) => {
            setSearch(v)
            setPage(1)
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={status ? 'No plans in this view' : 'No installment plans yet'}
            description={status ? 'Try another tab or search.' : `Create a plan when a ${terms.customer.toLowerCase()} buys on installments.`}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Plan</TH>
                <TH>{terms.customer}</TH>
                <TH>Total</TH>
                <TH className="min-w-40">Paid</TH>
                <TH>Balance</TH>
                <TH>Next due</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => {
                const overdue = Number(p.overdue_amount ?? 0) > 0
                return (
                  <TR key={p.id} className="cursor-pointer" onClick={() => navigate(`/installments/${p.id}`)}>
                    <TD>
                      <p className="font-semibold">{p.plan_number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.start_date)}</p>
                    </TD>
                    <TD>
                      <p className="font-medium">{p.customer?.name ?? '—'}</p>
                      {p.customer?.phone && <p className="text-xs text-muted-foreground">{p.customer.phone}</p>}
                    </TD>
                    <TD className="whitespace-nowrap font-medium">{formatMoney(Number(p.total_amount))}</TD>
                    <TD>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{formatMoney(Number(p.paid_amount))}</span>
                          <span className="font-semibold">{p.progress}%</span>
                        </div>
                        <ProgressBar value={p.progress} tone={p.status === 'completed' ? 'success' : overdue ? 'error' : 'brand'} />
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap font-semibold">{formatMoney(Number(p.balance))}</TD>
                    <TD className="whitespace-nowrap">
                      {p.status !== 'active' || !p.next_due_date ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <>
                          <p className="font-medium">{formatDate(p.next_due_date)}</p>
                          <p className={cn('text-xs', daysFromToday(p.next_due_date) < 0 ? 'font-medium text-error' : 'text-muted-foreground')}>
                            {relativeDue(p.next_due_date)}
                          </p>
                        </>
                      )}
                    </TD>
                    <TD>
                      <InstallmentStatusBadge status={p.status === 'active' && overdue ? 'overdue' : p.status} />
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </div>
      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  )
}
