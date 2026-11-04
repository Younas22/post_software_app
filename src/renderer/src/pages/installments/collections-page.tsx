import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarCheck, CalendarClock, HandCoins, Phone, Wallet } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Skeleton } from '@renderer/components/ui/loading-state'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { StatCard } from '@renderer/components/ui/stat-card'
import { InstallmentsGate, InstallmentStatusBadge, PageHeader } from '@renderer/components/installments/installment-ui'
import { remote } from '@renderer/lib/remote'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useTerms } from '@renderer/lib/use-branding'
import { PERMISSIONS } from '@renderer/lib/navPermissions'
import { telHref } from '@renderer/lib/branding'
import { cn } from '@renderer/lib/cn'
import { relativeDue, type InstallmentDueRow, type InstallmentSummary } from '@renderer/lib/installments'

/** The daily collection desk: who is late, who is due this week — one click to call or collect. */
export function CollectionsPage(): React.JSX.Element {
  return (
    <InstallmentsGate>
      <Desk />
    </InstallmentsGate>
  )
}

function Desk(): React.JSX.Element {
  const navigate = useNavigate()
  const terms = useTerms()
  const canCollect = useAuthStore((s) => s.hasPermission(PERMISSIONS.installmentsCollect))
  const [s, setS] = useState<InstallmentSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    remote
      .get<InstallmentSummary>('/installments/summary')
      .then(({ data }) => setS(data))
      .catch(() => setS(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader title="Collections" subtitle="Today's follow-ups — overdue accounts first, then what falls due this week." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Overdue"
          value={formatMoney(Number(s?.overdue_amount ?? 0))}
          icon={AlertTriangle}
          tone={s && Number(s.overdue_amount) > 0 ? 'error' : 'default'}
          loading={loading}
          hint={s ? `${s.overdue_plans} ${terms.customers.toLowerCase()} late` : undefined}
        />
        <StatCard label="Due today" value={formatMoney(Number(s?.due_today ?? 0))} icon={CalendarCheck} tone="warning" loading={loading} />
        <StatCard label="Due in next 7 days" value={formatMoney(Number(s?.due_this_week ?? 0))} icon={CalendarClock} tone="brand" loading={loading} />
        <StatCard
          label="Collected today"
          value={formatMoney(Number(s?.collected_today ?? 0))}
          icon={HandCoins}
          tone="success"
          loading={loading}
          hint={s ? `${formatMoney(Number(s.collected_this_month))} this month` : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DueList title="Overdue" tone="error" rows={s?.overdue ?? []} loading={loading} canCollect={canCollect} emptyTitle="Nobody is late" emptyDescription="Every installment due so far has been paid." />
        <DueList title="Due this week" tone="brand" rows={s?.upcoming ?? []} loading={loading} canCollect={canCollect} emptyTitle="Nothing due this week" emptyDescription="No installments fall due in the next 7 days." />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Wallet className="size-5" />
          </span>
          <div>
            <p className="font-semibold">{formatMoney(Number(s?.outstanding ?? 0))} outstanding</p>
            <p className="text-sm text-muted-foreground">Across {s?.active_count ?? 0} active plans</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/installments')}>
          View all plans
        </Button>
      </div>
    </div>
  )
}

function DueList({
  title,
  tone,
  rows,
  loading,
  canCollect,
  emptyTitle,
  emptyDescription
}: {
  title: string
  tone: 'error' | 'brand'
  rows: InstallmentDueRow[]
  loading: boolean
  canCollect: boolean
  emptyTitle: string
  emptyDescription: string
}): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <span className={cn('size-2.5 rounded-full', tone === 'error' ? 'bg-error' : 'bg-brand')} />
          {title}
        </h2>
        {!loading && <span className="text-sm text-muted-foreground">{rows.length} shown</span>}
      </div>
      {loading ? (
        <div className="space-y-3 p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/installments/${row.installment_plan_id}`)} className="truncate font-semibold hover:text-brand">
                    {row.customer?.name ?? '—'}
                  </button>
                  <InstallmentStatusBadge status={row.status} />
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.plan_number} · Installment #{row.sequence} · {formatDate(row.due_date)} ·{' '}
                  <span className={row.status === 'overdue' ? 'font-medium text-error' : ''}>{relativeDue(row.due_date)}</span>
                </p>
              </div>
              <p className="text-base font-bold tabular-nums">{formatMoney(Number(row.remaining))}</p>
              {row.customer?.phone && (
                <a
                  href={telHref(row.customer.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-10 items-center justify-center rounded-md border border-border hover:bg-muted"
                  aria-label={`Call ${row.customer.name}`}
                  title={row.customer.phone}
                >
                  <Phone className="size-4" />
                </a>
              )}
              {canCollect && (
                <Button size="sm" onClick={() => navigate(`/installments/${row.installment_plan_id}?collect=1`)}>
                  Collect
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
