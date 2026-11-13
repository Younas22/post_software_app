import { useEffect, useState } from 'react'
import { Printer, WifiOff } from 'lucide-react'
import { Modal } from '@renderer/components/ui/modal'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { toast } from '@renderer/lib/stores/toastStore'
import { loadReceipt, receiptHtml } from '@renderer/lib/installment-receipts'

/**
 * Print preview of an installment RECOVERY receipt — the same template as
 * the web app, previewed in an isolated iframe and printed through the
 * desktop's existing print engine (system print dialog → any printer or PDF).
 * Works offline for receipts already cached on this device.
 */
export function ReceiptPreviewModal({
  planId,
  paymentId,
  open,
  onClose,
  autoPrint = false
}: {
  planId: number
  paymentId: number | null
  open: boolean
  onClose: () => void
  autoPrint?: boolean
}): React.JSX.Element {
  const online = useSyncStore((s) => s.online) === 'online'
  const [html, setHtml] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!open || !paymentId) return
    let cancelled = false
    setHtml(null)
    setError(null)
    void loadReceipt(planId, paymentId, online).then((result) => {
      if (cancelled) return
      if (!result) {
        setError(online ? "Couldn't load the receipt." : 'This receipt has not been opened on this device before, so it is not available offline.')
        return
      }
      setOffline(result.offline)
      setHtml(receiptHtml(result.data))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planId, paymentId])

  async function print(doc = html): Promise<void> {
    if (!doc) return
    setPrinting(true)
    try {
      const result = await window.pos.printer.printDocument(doc)
      if (!result.ok && result.message && result.message !== 'cancelled') {
        toast({ variant: 'error', title: 'Print failed', description: result.message })
      }
    } finally {
      setPrinting(false)
    }
  }

  useEffect(() => {
    if (open && autoPrint && html) void print(html)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Installment receipt"
      description="Print or reprint — choose any printer, or “Save as PDF”, in the print dialog."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void print()} loading={printing} disabled={!html}>
            <Printer className="size-4" /> Print
          </Button>
        </>
      }
    >
      {offline && (
        <div className="mb-3">
          <Alert variant="warning" title="Offline copy">
            <span className="inline-flex items-center gap-1.5">
              <WifiOff className="size-4" /> Printed from the copy saved on this device.
            </span>
          </Alert>
        </div>
      )}
      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : !html ? (
        <LoadingState label="Preparing receipt..." />
      ) : (
        <iframe title="Receipt preview" srcDoc={html} className="h-[62vh] w-full rounded-lg border border-border bg-[#e9e9e9]" />
      )}
    </Modal>
  )
}
