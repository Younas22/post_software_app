import { useEffect, useState } from 'react'
import { Printer, WifiOff } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { listCachedReceipts, type CachedReceiptRef } from '@renderer/lib/installment-receipts'
import { ReceiptPreviewModal } from './receipt-preview-modal'

/**
 * Offline view of the installments module: plans live on the server, but
 * every recovery receipt opened on this device is cached locally, so it can
 * still be reprinted without a connection.
 */
export function OfflineReceipts(): React.JSX.Element {
  const [rows, setRows] = useState<CachedReceiptRef[] | null>(null)
  const [open, setOpen] = useState<CachedReceiptRef | null>(null)

  useEffect(() => {
    void listCachedReceipts().then(setRows)
  }, [])

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
        <WifiOff className="size-5 shrink-0" />
        You&apos;re offline. Installment plans and new recoveries need a connection — receipts already opened on this device can be reprinted below.
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold">Receipts saved on this device</h2>
        {rows === null ? null : rows.length === 0 ? (
          <EmptyState icon={Printer} title="No saved receipts yet" description="Receipts are saved here automatically the first time they are opened online." />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.customer ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.receiptNo} · {r.date ? formatDate(r.date) : '—'}
                  </p>
                </div>
                <p className="font-bold tabular-nums">{formatMoney(Number(r.amount))}</p>
                <Button size="sm" variant="outline" onClick={() => setOpen(r)}>
                  <Printer className="size-4" /> Reprint
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {open && <ReceiptPreviewModal planId={open.planId} paymentId={open.paymentId} open onClose={() => setOpen(null)} />}
    </div>
  )
}
