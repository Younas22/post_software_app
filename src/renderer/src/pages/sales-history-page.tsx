import { useEffect, useState } from 'react'
import { Receipt as ReceiptIcon, Printer, RotateCcw } from 'lucide-react'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { TableSkeleton } from '@renderer/components/ui/loading-state'
import { StatusBadge } from '@renderer/components/ui/badge'
import { IconButton } from '@renderer/components/ui/icon-button'
import { Modal } from '@renderer/components/ui/modal'
import { toast } from '@renderer/lib/stores/toastStore'
import { formatDateTime, formatMoney } from '@renderer/lib/format'
import { ReturnModal } from '@renderer/components/pos/return-modal'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import type { LocalSale } from '@shared/types'

export function SalesHistoryPage(): React.JSX.Element {
  const [sales, setSales] = useState<LocalSale[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<LocalSale | null>(null)
  const [returning, setReturning] = useState<LocalSale | null>(null)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  async function load(): Promise<void> {
    setLoading(true)
    try {
      setSales(await window.pos.sales.list(200))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function reprint(sale: LocalSale): Promise<void> {
    const result = await window.pos.printer.printReceipt(sale.local_id)
    if (!result.ok) toast({ variant: 'error', title: 'Printer unavailable', description: result.message })
    else toast({ variant: 'success', title: 'Sent to printer' })
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sales History</h1>
        <p className="text-sm text-muted-foreground">Recent sales made on this device, including ones still waiting to sync.</p>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border">
          <TableSkeleton />
        </div>
      ) : sales.length === 0 ? (
        <EmptyState icon={ReceiptIcon} title="No sales yet" description="Sales made at the POS will appear here." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Date</TH>
              <TH className="text-right">Total</TH>
              <TH>Sync</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {sales.map((sale) => (
              <TR key={sale.local_id} className="cursor-pointer" onClick={() => setDetail(sale)}>
                <TD className="font-medium">{sale.invoice_number ?? `#${sale.local_id.slice(0, 8)}`}</TD>
                <TD>{formatDateTime(sale.sale_date)}</TD>
                <TD className="text-right">{formatMoney(sale.total)}</TD>
                <TD>
                  <StatusBadge status={sale.sync_status} />
                </TD>
                <TD className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <IconButton aria-label="Reprint receipt" onClick={() => reprint(sale)}>
                      <Printer className="size-4" />
                    </IconButton>
                    {hasPermission('returns.process') && sale.server_id && (
                      <IconButton aria-label="Return items" onClick={() => setReturning(sale)}>
                        <RotateCcw className="size-4" />
                      </IconButton>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {detail && (
        <Modal open onClose={() => setDetail(null)} title={detail.invoice_number ?? 'Sale detail'} size="lg">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Date</span>
              <span>{formatDateTime(detail.sale_date)}</span>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Item</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {detail.items.map((item, i) => (
                  <TR key={i}>
                    <TD>{item.product_name}</TD>
                    <TD className="text-right">{item.quantity}</TD>
                    <TD className="text-right">{formatMoney(item.unit_price)}</TD>
                    <TD className="text-right">{formatMoney(item.line_total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <div className="ml-auto max-w-56 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(detail.subtotal)}</span>
              </div>
              {detail.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>&minus;{formatMoney(detail.discount)}</span>
                </div>
              )}
              {detail.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatMoney(detail.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoney(detail.total)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {returning && (
        <ReturnModal
          sale={returning}
          onClose={() => setReturning(null)}
          onDone={() => {
            setReturning(null)
            toast({ variant: 'success', title: 'Return processed' })
          }}
        />
      )}
    </div>
  )
}
