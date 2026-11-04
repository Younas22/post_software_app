import { useEffect, useState } from 'react'
import { Boxes, PlusCircle, MinusCircle } from 'lucide-react'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { SearchInput } from '@renderer/components/ui/search-input'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { TableSkeleton } from '@renderer/components/ui/loading-state'
import { Badge } from '@renderer/components/ui/badge'
import { IconButton } from '@renderer/components/ui/icon-button'
import { Modal } from '@renderer/components/ui/modal'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { remote, RemoteError } from '@renderer/lib/remote'
import { toast } from '@renderer/lib/stores/toastStore'
import type { Product } from '@shared/types'
import { useTerms } from '@renderer/lib/use-branding'

export function InventoryPage(): React.JSX.Element {
  const terms = useTerms()
  const [query, setQuery] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [rows, setRows] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [adjusting, setAdjusting] = useState<Product | null>(null)

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const branch = useAppStore((s) => s.branch)
  const online = useSyncStore((s) => s.online)

  async function load(): Promise<void> {
    setLoading(true)
    try {
      if (lowStockOnly) {
        setRows(await window.pos.inventory.lowStock())
      } else {
        setRows(await window.pos.catalog.searchProducts(query))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lowStockOnly])

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{terms.inventory}</h1>
        <p className="text-sm text-muted-foreground">
          Stock levels for {branch?.name ?? 'this branch'} — read from this device's local cache, kept in sync automatically.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="max-w-xs flex-1">
          <SearchInput placeholder="Search products..." onSearch={setQuery} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border">
          <TableSkeleton />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title={`No ${terms.products.toLowerCase()} found`} description="Try a different search, or sync this device." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>SKU</TH>
              <TH className="text-right">Stock</TH>
              <TH className="text-right">Min. stock</TH>
              {hasPermission('inventory.adjust') && <TH className="text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {rows.map((p) => {
              const low = (p.stock_quantity ?? 0) <= p.minimum_stock
              return (
                <TR key={p.id}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD>{p.sku ?? '—'}</TD>
                  <TD className="text-right">
                    {p.stock_quantity ?? 0} {low && <Badge variant="warning">Low</Badge>}
                  </TD>
                  <TD className="text-right">{p.minimum_stock}</TD>
                  {hasPermission('inventory.adjust') && (
                    <TD className="text-right">
                      <IconButton aria-label="Adjust stock" disabled={online !== 'online'} onClick={() => setAdjusting(p)}>
                        <PlusCircle className="size-4" />
                      </IconButton>
                    </TD>
                  )}
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}

      {online !== 'online' && hasPermission('inventory.adjust') && (
        <p className="text-xs text-muted-foreground">Stock adjustments require an internet connection.</p>
      )}

      {adjusting && (
        <AdjustStockModal
          product={adjusting}
          branchId={branch?.id ?? null}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null)
            void load()
          }}
        />
      )}
    </div>
  )
}

function AdjustStockModal({
  product,
  branchId,
  onClose,
  onDone
}: {
  product: Product
  branchId: number | null
  onClose: () => void
  onDone: () => void
}): React.JSX.Element {
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(): Promise<void> {
    if (!branchId || quantity <= 0) return
    setSaving(true)
    setError(null)
    try {
      await remote.post('/inventory/adjust', {
        branch_id: branchId,
        product_id: product.id,
        quantity: direction === 'in' ? quantity : -quantity,
        notes: notes || undefined
      })
      toast({ variant: 'success', title: 'Stock adjusted' })
      onDone()
    } catch (err) {
      setError(err instanceof RemoteError ? err.message : 'Adjustment failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust stock — ${product.name}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex gap-2">
          <Button variant={direction === 'in' ? 'primary' : 'outline'} onClick={() => setDirection('in')} type="button">
            <PlusCircle className="size-4" /> Stock in
          </Button>
          <Button variant={direction === 'out' ? 'primary' : 'outline'} onClick={() => setDirection('out')} type="button">
            <MinusCircle className="size-4" /> Stock out
          </Button>
        </div>
        <Field label="Quantity" required>
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
