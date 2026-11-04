import { useEffect, useState } from 'react'
import { Modal } from '@renderer/components/ui/modal'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import { remote, RemoteError } from '@renderer/lib/remote'
import { formatMoney } from '@renderer/lib/format'
import { toast } from '@renderer/lib/stores/toastStore'
import { cn } from '@renderer/lib/cn'
import { isoDate, type InstallmentPayment, type InstallmentPlan } from '@renderer/lib/installments'
import type { PaymentMethod } from '@shared/types'

/**
 * Collects a payment on a plan. Suggests the overdue amount (or the next
 * installment) with one-click presets; the server allocates it to the
 * oldest unpaid installments first.
 */
export function CollectPaymentModal({
  plan,
  open,
  onClose,
  onCollected
}: {
  plan: InstallmentPlan
  open: boolean
  onClose: () => void
  onCollected: (plan: InstallmentPlan) => void
}): React.JSX.Element {
  const balance = Number(plan.balance)
  const overdue = Number(plan.overdue_amount ?? 0)
  const next = plan.schedules?.find((s) => s.status !== 'paid')
  const nextRemaining = next ? Number(next.amount) - Number(next.paid_amount) : 0
  const suggested = Math.min(balance, overdue > 0 ? overdue : nextRemaining || balance)

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [amount, setAmount] = useState('')
  const [methodId, setMethodId] = useState('')
  const [date, setDate] = useState(isoDate(new Date()))
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void window.pos.catalog.listPaymentMethods().then((list) => {
      setMethods(list)
      const cash = list.find((m) => m.slug === 'cash') ?? list[0]
      if (cash) setMethodId(String(cash.id))
    })
  }, [])

  useEffect(() => {
    if (!open) return
    setAmount(suggested > 0 ? suggested.toFixed(2) : '')
    setDate(isoDate(new Date()))
    setReference('')
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan.id])

  const presets = [
    nextRemaining > 0 && { label: 'Next installment', value: nextRemaining },
    overdue > 0 && { label: 'All overdue', value: overdue },
    balance > 0 && { label: 'Full balance', value: balance }
  ].filter(Boolean) as Array<{ label: string; value: number }>

  async function submit(): Promise<void> {
    setError(null)
    const value = Number(amount)
    if (!value || value <= 0) return setError('Enter an amount greater than zero.')
    if (value > balance + 0.001) return setError(`The amount can't be more than the remaining balance (${formatMoney(balance)}).`)
    setSaving(true)
    try {
      const { data } = await remote.post<{ payment: InstallmentPayment; plan: InstallmentPlan }>(`/installments/${plan.id}/payments`, {
        amount: value,
        payment_method_id: methodId ? Number(methodId) : null,
        payment_date: date,
        reference: reference || null
      })
      toast({ variant: 'success', title: `${formatMoney(value)} collected`, description: `Receipt ${data.payment.receipt_number}` })
      onCollected(data.plan)
      onClose()
    } catch (err) {
      setError(err instanceof RemoteError ? (err.fieldError('amount') ?? err.message) : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Collect payment"
      description={`${plan.plan_number} · ${plan.customer?.name ?? ''} · Balance ${formatMoney(balance)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Collect {Number(amount) > 0 ? formatMoney(Number(amount)) : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {presets.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setAmount(p.value.toFixed(2))}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  Number(amount) === Number(p.value.toFixed(2)) ? 'border-brand bg-brand-soft' : 'border-border hover:bg-muted'
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">{p.label}</p>
                <p className="mt-0.5 text-base font-semibold">{formatMoney(p.value)}</p>
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" required>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-base font-semibold" />
          </Field>
          <Field label="Payment method">
            <Select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} max={isoDate(new Date())} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Reference" hint="Cheque / transaction no. (optional)">
            <Input value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
