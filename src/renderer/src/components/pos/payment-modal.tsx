import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@renderer/components/ui/modal'
import { Button } from '@renderer/components/ui/button'
import { Select } from '@renderer/components/ui/select'
import { Input } from '@renderer/components/ui/input'
import { Alert } from '@renderer/components/ui/alert'
import { formatMoney } from '@renderer/lib/format'
import { usePosStore } from '@renderer/lib/stores/posStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import type { PaymentMethod } from '@shared/types'
import type { SaleCreateResult } from '@shared/preload-api'

interface PaymentRow {
  key: number
  paymentMethodId: number | null
  amount: number
}

export function PaymentModal({
  onClose,
  onComplete
}: {
  onClose: () => void
  onComplete: (result: SaleCreateResult) => void
}): React.JSX.Element {
  const { lines, customer, total, ensureTransactionId } = usePosStore()
  const branch = useAppStore((s) => s.branch)
  const totalDue = total()

  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [rows, setRows] = useState<PaymentRow[]>([{ key: 0, paymentMethodId: null, amount: totalDue }])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void window.pos.catalog.listPaymentMethods().then((list) => {
      setMethods(list)
      if (list.length > 0) setRows((prev) => prev.map((r) => (r.paymentMethodId === null ? { ...r, paymentMethodId: list[0].id } : r)))
    })
  }, [])

  const paidTotal = rows.reduce((sum, r) => sum + (r.amount || 0), 0)
  const remaining = Math.round((totalDue - paidTotal) * 100) / 100

  function addRow(): void {
    setRows((prev) => [...prev, { key: prev.length, paymentMethodId: methods[0]?.id ?? null, amount: Math.max(remaining, 0) }])
  }

  async function submit(): Promise<void> {
    if (!branch) {
      setError('No active branch — please sign in again.')
      return
    }
    if (remaining > 0.01) {
      setError('Amount paid is less than the total due.')
      return
    }
    if (rows.some((r) => !r.paymentMethodId || r.amount <= 0)) {
      setError('Every payment row needs a method and a positive amount.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const result = await window.pos.sales.create({
        branch_id: branch.id,
        customer_id: customer?.id ?? null,
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity, discount: l.discount || undefined })),
        payments: rows.map((r) => ({ payment_method_id: r.paymentMethodId!, amount: r.amount })),
        client_transaction_id: ensureTransactionId()
      })

      // Cash drawer trigger (Phase 10 rule: "after successful cash
      // payment") — never awaited/blocking; a missing/unavailable drawer
      // must not affect the completed sale in any way.
      const usedCash = rows.some((r) => methods.find((m) => m.id === r.paymentMethodId)?.slug === 'cash')
      if (usedCash) void window.pos.printer.openCashDrawer().catch(() => undefined)

      onComplete(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete the sale.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Payment"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Complete sale
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
          <span className="text-sm font-medium">Total due</span>
          <span className="text-lg font-semibold">{formatMoney(totalDue)}</span>
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={row.key} className="flex items-center gap-2">
              <Select
                className="flex-1"
                value={row.paymentMethodId ?? ''}
                onChange={(e) => setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, paymentMethodId: Number(e.target.value) } : r)))}
              >
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                step="0.01"
                className="w-32"
                value={row.amount}
                onChange={(e) => setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, amount: Number(e.target.value) } : r)))}
              />
              {rows.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}>
                  <Trash2 className="size-4" />
                </Button>
              )}
              {i === rows.length - 1 && (
                <Button variant="ghost" size="sm" onClick={addRow}>
                  <Plus className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{remaining > 0 ? 'Remaining' : 'Change'}</span>
          <span className={remaining > 0.01 ? 'font-medium text-error' : 'font-medium text-success'}>{formatMoney(Math.abs(remaining))}</span>
        </div>
      </div>
    </Modal>
  )
}
