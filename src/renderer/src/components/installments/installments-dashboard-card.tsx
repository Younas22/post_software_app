import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Skeleton } from '@renderer/components/ui/loading-state'
import { remote } from '@renderer/lib/remote'
import { formatMoney } from '@renderer/lib/format'
import { relativeDue, type InstallmentSummary } from '@renderer/lib/installments'
import { cn } from '@renderer/lib/cn'

/** Dashboard block for installment businesses: collection health + who to chase first. */
export function InstallmentsDashboardCard(): React.JSX.Element {
  const navigate = useNavigate()
  const [s, setS] = useState<InstallmentSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    remote
      .get<InstallmentSummary>('/installments/summary')
      .then(({ data }) => setS(data))
      .catch(() => setS(null))
      .finally(() => setLoading(false))
  }, [])

  const metrics = [
    { label: 'Outstanding', value: s?.outstanding ?? 0, tone: '' },
    { label: 'Overdue', value: s?.overdue_amount ?? 0, tone: s && Number(s.overdue_amount) > 0 ? 'text-error' : '' },
    { label: 'Due today', value: s?.due_today ?? 0, tone: s && Number(s.due_today) > 0 ? 'text-warning' : '' },
    { label: 'Collected today', value: s?.collected_today ?? 0, tone: 'text-success' }
  ]
  const chase = [...(s?.overdue ?? []), ...(s?.upcoming ?? [])].slice(0, 5)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Installment collections</h2>
        <button onClick={() => navigate('/collections')} className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          Collection desk <ArrowRight className="size-4" />
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid grid-cols-2 content-start gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</p>
              {loading ? <Skeleton className="mt-2 h-6 w-24" /> : <p className={cn('mt-1 text-lg font-bold tabular-nums', m.tone)}>{formatMoney(Number(m.value))}</p>}
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chase first</p>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : chase.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing overdue or due this week.</p>
          ) : (
            <ul className="space-y-1.5">
              {chase.map((row) => (
                <li key={row.id}>
                  <button
                    onClick={() => navigate(`/installments/${row.installment_plan_id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{row.customer?.name ?? row.plan_number}</span>
                      <span className={cn('block text-xs', row.status === 'overdue' ? 'font-medium text-error' : 'text-muted-foreground')}>
                        {row.plan_number} · {relativeDue(row.due_date)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{formatMoney(Number(row.remaining))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
