import { useEffect, useState } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import { Modal } from '@renderer/components/ui/modal'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import { formatMoney } from '@renderer/lib/format'
import type { SaleCreateResult } from '@shared/preload-api'

export function SaleSuccessModal({ result, onClose }: { result: SaleCreateResult; onClose: () => void }): React.JSX.Element {
  const { sale } = result
  const [receipt, setReceipt] = useState(result.receipt)
  const [printResult, setPrintResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    // The sale is created as 'pending' and synced moments later in the
    // background (see registerIpc's SalesCreate handler) — poll briefly so
    // the "recorded offline" badge clears once it actually finishes, rather
    // than staying stuck on a state that was only true for an instant.
    if (!sale.server_id) {
      let cancelled = false
      const poll = setInterval(async () => {
        const updated = await window.pos.sales.getReceipt(sale.local_id)
        if (updated && !cancelled) {
          setReceipt(updated)
          if (!updated.is_offline) clearInterval(poll)
        }
      }, 1000)
      const stop = setTimeout(() => clearInterval(poll), 8000)
      return () => {
        cancelled = true
        clearInterval(poll)
        clearTimeout(stop)
      }
    }
    return undefined
  }, [sale.local_id, sale.server_id])

  async function doPrint(): Promise<void> {
    setPrinting(true)
    try {
      const res = await window.pos.printer.printReceipt(sale.local_id)
      setPrintResult(res)
    } finally {
      setPrinting(false)
    }
  }

  useEffect(() => {
    // Printing happens here, AFTER the success screen is already showing —
    // never blocks "sale complete" from appearing (Phase 09). A slow or
    // unavailable printer only affects this indicator, never the sale.
    void (async () => {
      const setting = await window.pos.settings.get('auto_print_receipt')
      if (setting !== '0') void doPrint()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Modal open onClose={onClose} title="Sale complete" size="sm">
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <div>
          <p className="text-sm text-muted-foreground">{receipt.invoice_number}</p>
          <p className="text-2xl font-semibold">{formatMoney(receipt.total)}</p>
          {receipt.is_offline && <p className="mt-1 text-xs text-warning">Recorded offline — will sync automatically.</p>}
        </div>

        {printing && <p className="text-xs text-muted-foreground">Printing receipt…</p>}

        {printResult && !printResult.ok && (
          <Alert variant="warning" title="Printer unavailable">
            <p className="mb-2">{printResult.message ?? 'The receipt could not be printed.'}</p>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={doPrint} loading={printing}>
                Retry
              </Button>
            </div>
          </Alert>
        )}

        <div className="mt-2 flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={doPrint} loading={printing}>
            <Printer className="size-4" /> Print again
          </Button>
          <Button className="flex-1" onClick={onClose}>
            New sale
          </Button>
        </div>
      </div>
    </Modal>
  )
}
