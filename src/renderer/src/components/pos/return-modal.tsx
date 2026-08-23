import { useEffect, useState } from 'react'
import { Modal } from '@renderer/components/ui/modal'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { remote, RemoteError } from '@renderer/lib/remote'
import { formatMoney } from '@renderer/lib/format'
import type { LocalSale } from '@shared/types'

interface ServerSaleItem {
  id: number
  quantity: number
  unit_price: number
  line_total: number
  product: { name: string } | null
}

interface ServerSale {
  id: number
  invoice_number: string
  items: ServerSaleItem[]
}

export function ReturnModal({ sale, onClose, onDone }: { sale: LocalSale; onClose: () => void; onDone: () => void }): React.JSX.Element {
  const [loading, setLoading] = useState(true)
  const [serverSale, setServerSale] = useState<ServerSale | null>(null)
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sale.server_id) return
    remote
      .get<ServerSale>(`/sales/${sale.server_id}`)
      .then(({ data }) => setServerSale(data))
      .catch((err) => setError(err instanceof RemoteError ? err.message : 'Could not load sale.'))
      .finally(() => setLoading(false))
  }, [sale.server_id])

  async function submit(): Promise<void> {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([saleItemId, quantity]) => ({ sale_item_id: Number(saleItemId), quantity }))

    if (items.length === 0) {
      setError('Select at least one item to return.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await remote.post(`/sales/${sale.server_id}/returns`, { items, reason: reason || undefined })
      onDone()
    } catch (err) {
      setError(err instanceof RemoteError ? err.message : 'Return failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Return items — ${sale.invoice_number ?? ''}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={loading}>
            Process return
          </Button>
        </>
      }
    >
      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4">
          {error && <p className="text-sm text-error">{error}</p>}
          {!sale.server_id && <p className="text-sm text-warning">This sale hasn't finished syncing yet — returns require it to be on the server first.</p>}
          {serverSale?.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm">
              <div>
                <p className="font-medium">{item.product?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} &times; {formatMoney(item.unit_price)}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                max={item.quantity}
                className="w-20"
                value={quantities[item.id] ?? 0}
                onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
              />
            </div>
          ))}
          <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </Modal>
  )
}
