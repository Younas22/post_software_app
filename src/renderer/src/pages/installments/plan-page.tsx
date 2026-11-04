import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Ban, CalendarClock, HandCoins, Phone, ShieldCheck, User } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import { InstallmentsGate, InstallmentStatusBadge, ProgressBar } from '@renderer/components/installments/installment-ui'
import { CollectPaymentModal } from '@renderer/components/installments/collect-payment-modal'
import { remote, RemoteError } from '@renderer/lib/remote'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useTerms } from '@renderer/lib/use-branding'
import { PERMISSIONS } from '@renderer/lib/navPermissions'
import { telHref } from '@renderer/lib/branding'
import { cn } from '@renderer/lib/cn'
import { FREQUENCY_LABEL, relativeDue, type InstallmentPlan } from '@renderer/lib/installments'

export function InstallmentPlanPage(): React.JSX.Element {
  return (
    <InstallmentsGate>
      <PlanDetail />
    </InstallmentsGate>
  )
}

function PlanDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const terms = useTerms()
  const { hasPermission } = useAuthStore()
  const [plan, setPlan] = useState<InstallmentPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [collectOpen, setCollectOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    setLoading(true)
    remote
      .get<InstallmentPlan>(`/installments/${id}`)
      .then(({ data }) => {
        setPlan(data)
        // /installments/12?collect=1 (from the Collections desk) opens the dialog straight away.
        if (searchParams.get('collect') === '1' && data.status === 'active') setCollectOpen(true)
      })
      .catch(() => setPlan(null))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <LoadingState label="Loading plan..." />
  if (!plan) {
    return (
      <div className="p-12">
        <EmptyState icon={CalendarClock} title="Plan not found" description="It may belong to another branch." />
      </div>
    )
  }

  const p = plan
  const overdue = Number(p.overdue_amount ?? 0)
  const canCollect = p.status === 'active' && hasPermission(PERMISSIONS.installmentsCollect)
  const canCancel = p.status === 'active' && hasPermission(PERMISSIONS.installmentsCancel)

  async function cancelPlan(): Promise<void> {
    setCancelling(true)
    try {
      const { data } = await remote.patch<InstallmentPlan>(`/installments/${p.id}/cancel`)
      setPlan(data)
      toast({ variant: 'success', title: 'Plan cancelled' })
    } catch (err) {
      toast({ variant: 'error', title: "Couldn't cancel plan", description: err instanceof RemoteError ? err.message : undefined })
    } finally {
      setCancelling(false)
      setConfirmCancel(false)
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/installments')} className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Installment Plans
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{p.plan_number}</h1>
            <InstallmentStatusBadge status={p.status === 'active' && overdue > 0 ? 'overdue' : p.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.customer?.name} · {p.installments_count} × {FREQUENCY_LABEL[p.frequency].toLowerCase()} · started {formatDate(p.start_date)}
            {p.branch ? ` · ${p.branch.name}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <Button variant="outline" className="text-error" onClick={() => setConfirmCancel(true)}>
              <Ban className="size-4" /> Cancel plan
            </Button>
          )}
          {canCollect && (
            <Button size="lg" onClick={() => setCollectOpen(true)}>
              <HandCoins className="size-4" /> Collect payment
            </Button>
          )}
        </div>
      </div>

      {overdue > 0 && p.status === 'active' && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-error/30 bg-error-soft px-4 py-3">
          <p className="text-sm font-medium text-error">{formatMoney(overdue)} is overdue on this plan.</p>
          {canCollect && (
            <Button size="sm" variant="danger" onClick={() => setCollectOpen(true)}>
              Collect now
            </Button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Installment price" value={formatMoney(Number(p.total_amount))} hint={`${formatMoney(Number(p.subtotal))} cash + ${Number(p.markup_percent)}% markup`} />
          <Metric label="Paid so far" value={formatMoney(Number(p.paid_amount))} hint={`incl. ${formatMoney(Number(p.down_payment))} down payment`} tone="success" />
          <Metric
            label="Balance"
            value={formatMoney(Number(p.balance))}
            hint={`${p.paid_installments ?? 0} of ${p.installments_count} installments paid`}
            tone={overdue > 0 ? 'error' : undefined}
          />
          <Metric
            label="Next due"
            value={p.status === 'active' && p.next_due_date ? formatDate(p.next_due_date) : '—'}
            hint={
              p.status === 'active' && p.next_due_date
                ? `${relativeDue(p.next_due_date)} · ${formatMoney(Number(p.installment_amount))}`
                : p.status === 'completed'
                  ? 'Fully paid 🎉'
                  : undefined
            }
          />
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs font-medium text-muted-foreground">
            <span>Progress</span>
            <span className="text-foreground">{p.progress}%</span>
          </div>
          <ProgressBar value={p.progress} className="h-2.5" tone={p.status === 'completed' ? 'success' : overdue > 0 ? 'error' : 'brand'} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <h2 className="px-5 pt-5 text-base font-semibold">Installment schedule</h2>
            <Table className="mt-3">
              <THead>
                <TR>
                  <TH className="w-12">#</TH>
                  <TH>Due date</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Paid</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {p.schedules?.map((s) => (
                  <TR key={s.id} className={cn(s.status === 'overdue' && p.status === 'active' && 'bg-error-soft/40')}>
                    <TD className="font-medium text-muted-foreground">{s.sequence}</TD>
                    <TD>
                      <p className="font-medium">{formatDate(s.due_date)}</p>
                      {s.status !== 'paid' && p.status === 'active' && (
                        <p className={cn('text-xs', s.status === 'overdue' ? 'text-error' : 'text-muted-foreground')}>{relativeDue(s.due_date)}</p>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">{formatMoney(Number(s.amount))}</TD>
                    <TD className="text-right tabular-nums">{Number(s.paid_amount) > 0 ? formatMoney(Number(s.paid_amount)) : '—'}</TD>
                    <TD>
                      <InstallmentStatusBadge status={p.status === 'cancelled' && s.status !== 'paid' ? 'cancelled' : s.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <h2 className="px-5 pt-5 text-base font-semibold">Payments received</h2>
            {(p.payments?.length ?? 0) === 0 ? (
              <EmptyState icon={HandCoins} title="No payments yet" />
            ) : (
              <Table className="mt-3">
                <THead>
                  <TR>
                    <TH>Receipt</TH>
                    <TH>Date</TH>
                    <TH>Method</TH>
                    <TH>Received by</TH>
                    <TH className="text-right">Amount</TH>
                  </TR>
                </THead>
                <TBody>
                  {p.payments?.map((pay) => (
                    <TR key={pay.id}>
                      <TD>
                        <p className="font-medium">{pay.receipt_number}</p>
                        {(pay.is_down_payment || pay.reference) && (
                          <p className="text-xs text-muted-foreground">{pay.is_down_payment ? 'Down payment' : `Ref ${pay.reference}`}</p>
                        )}
                      </TD>
                      <TD>{formatDate(pay.payment_date)}</TD>
                      <TD className="text-muted-foreground">{pay.payment_method?.name ?? '—'}</TD>
                      <TD className="text-muted-foreground">{pay.user?.name ?? '—'}</TD>
                      <TD className="text-right font-semibold tabular-nums text-success">{formatMoney(Number(pay.amount))}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <InfoCard icon={User} title={terms.customer}>
            <p className="font-semibold">{p.customer?.name}</p>
            {p.customer?.phone && (
              <a href={telHref(p.customer.phone)} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 text-brand hover:underline">
                <Phone className="size-3.5" /> {p.customer.phone}
              </a>
            )}
            {p.customer?.address && <p className="mt-1 text-muted-foreground">{p.customer.address}</p>}
            {p.customer_cnic && <p className="mt-1 text-muted-foreground">CNIC: {p.customer_cnic}</p>}
          </InfoCard>
          <InfoCard icon={ShieldCheck} title="Guarantor">
            {p.guarantor_name ? (
              <>
                <p className="font-semibold">{p.guarantor_name}</p>
                {p.guarantor_phone && <p className="mt-1 text-muted-foreground">{p.guarantor_phone}</p>}
                {p.guarantor_cnic && <p className="mt-1 text-muted-foreground">CNIC: {p.guarantor_cnic}</p>}
                {p.guarantor_address && <p className="mt-1 text-muted-foreground">{p.guarantor_address}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">No guarantor recorded.</p>
            )}
          </InfoCard>
          <InfoCard icon={CalendarClock} title={terms.products}>
            <ul className="divide-y divide-border">
              {p.items?.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.product?.name ?? `#${item.product_id}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatMoney(Number(item.unit_price))}
                      {item.serial_number ? ` · S/N ${item.serial_number}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">{formatMoney(Number(item.line_total))}</span>
                </li>
              ))}
            </ul>
          </InfoCard>
          {p.notes && (
            <InfoCard icon={CalendarClock} title="Notes">
              <p className="whitespace-pre-line text-muted-foreground">{p.notes}</p>
            </InfoCard>
          )}
        </div>
      </div>

      {canCollect && <CollectPaymentModal plan={p} open={collectOpen} onClose={() => setCollectOpen(false)} onCollected={setPlan} />}
      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel plan ${p.plan_number}?`}
        description="The goods go back into stock. Payments already received stay on record."
        confirmLabel="Cancel plan"
        danger
        loading={cancelling}
        onConfirm={cancelPlan}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  )
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'success' | 'error' }): React.JSX.Element {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tracking-tight', tone === 'success' ? 'text-success' : tone === 'error' ? 'text-error' : 'text-foreground')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function InfoCard({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4" /> {title}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  )
}
