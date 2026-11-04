import { useEffect, useState } from 'react'
import { ShoppingBag, Plus, Trash2, Check, X } from 'lucide-react'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { TableSkeleton } from '@renderer/components/ui/loading-state'
import { Pagination } from '@renderer/components/ui/pagination'
import { StatusBadge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { IconButton } from '@renderer/components/ui/icon-button'
import { Modal } from '@renderer/components/ui/modal'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { SearchInput } from '@renderer/components/ui/search-input'
import { remote, RemoteError } from '@renderer/lib/remote'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import type { PaginationMeta, Product } from '@shared/types'
import { useTerms } from '@renderer/lib/use-branding'

interface PurchaseRow {
  id: number
  invoice_reference: string | null
  supplier?: { name: string } | null
  purchase_date: string
  total: number
  status: string
}

interface SupplierOption {
  id: number
  name: string
}

interface DraftItem {
  product: Product
  quantity: number
  purchase_price: number
}

export function PurchasesPage(): React.JSX.Element {
  const terms = useTerms()
  const [rows, setRows] = useState<PurchaseRow[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  async function load(): Promise<void> {
    setLoading(true)
    try {
      const { data, meta: m } = await remote.get<PurchaseRow[]>('/purchases', { page })
      setRows(data)
      setMeta(m ?? null)
    } catch (err) {
      toast({ variant: 'error', title: 'Could not load purchases', description: err instanceof Error ? err.message : undefined })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function receive(row: PurchaseRow): Promise<void> {
    try {
      await remote.patch(`/purchases/${row.id}/receive`)
      toast({ variant: 'success', title: 'Purchase received — stock updated' })
      void load()
    } catch (err) {
      toast({ variant: 'error', title: 'Could not receive purchase', description: err instanceof Error ? err.message : undefined })
    }
  }

  async function cancel(row: PurchaseRow): Promise<void> {
    try {
      await remote.patch(`/purchases/${row.id}/cancel`)
      toast({ variant: 'success', title: 'Purchase cancelled' })
      void load()
    } catch (err) {
      toast({ variant: 'error', title: 'Could not cancel purchase', description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{terms.purchases}</h1>
          <p className="text-sm text-muted-foreground">Stock received from suppliers.</p>
        </div>
        {hasPermission('purchases.create') && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" /> New Purchase
          </Button>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border border-border">
          <TableSkeleton />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={`No ${terms.purchases.toLowerCase()} yet`} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Reference</TH>
              <TH>Supplier</TH>
              <TH>Date</TH>
              <TH className="text-right">Total</TH>
              <TH>Status</TH>
              {hasPermission('purchases.update') && <TH className="text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium">{r.invoice_reference ?? `#${r.id}`}</TD>
                <TD>{r.supplier?.name ?? '—'}</TD>
                <TD>{formatDate(r.purchase_date)}</TD>
                <TD className="text-right">{formatMoney(r.total)}</TD>
                <TD>
                  <StatusBadge status={r.status} />
                </TD>
                {hasPermission('purchases.update') && (
                  <TD className="text-right">
                    {r.status === 'pending' && (
                      <div className="flex justify-end gap-1">
                        <IconButton aria-label="Receive" onClick={() => receive(r)}>
                          <Check className="size-4" />
                        </IconButton>
                        <IconButton aria-label="Cancel" onClick={() => cancel(r)}>
                          <X className="size-4" />
                        </IconButton>
                      </div>
                    )}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      {modalOpen && (
        <NewPurchaseModal
          onClose={() => setModalOpen(false)}
          onDone={() => {
            setModalOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}

function NewPurchaseModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }): React.JSX.Element {
  const branch = useAppStore((s) => s.branch)
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [supplierId, setSupplierId] = useState<number | ''>('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [invoiceRef, setInvoiceRef] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [productResults, setProductResults] = useState<Product[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    remote
      .get<SupplierOption[]>('/suppliers', { per_page: 200 })
      .then(({ data }) => setSuppliers(data))
      .catch(() => setSuppliers([]))
  }, [])

  function addItem(product: Product): void {
    setItems((prev) =>
      prev.some((i) => i.product.id === product.id)
        ? prev
        : [...prev, { product, quantity: 1, purchase_price: product.purchase_price }]
    )
    setProductResults([])
  }

  function updateItem(productId: number, patch: Partial<DraftItem>): void {
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, ...patch } : i)))
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.purchase_price, 0)

  async function submit(): Promise<void> {
    if (!branch || !supplierId || items.length === 0) {
      setError('Select a supplier and add at least one item.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await remote.post('/purchases', {
        branch_id: branch.id,
        supplier_id: supplierId,
        purchase_date: purchaseDate,
        invoice_reference: invoiceRef || undefined,
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity, purchase_price: i.purchase_price }))
      })
      toast({ variant: 'success', title: 'Purchase created' })
      onDone()
    } catch (err) {
      setError(err instanceof RemoteError ? err.message : 'Could not create purchase.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New Purchase"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create purchase
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Supplier" required>
            <Select value={supplierId} onChange={(e) => setSupplierId(Number(e.target.value))}>
              <option value="" disabled>
                Select supplier
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Purchase date" required>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </Field>
          <Field label="Invoice reference">
            <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
          </Field>
        </div>

        <div className="relative">
          <SearchInput
            placeholder="Search products to add..."
            onSearch={(q) => {
              if (!q) return setProductResults([])
              void window.pos.catalog.searchProducts(q).then(setProductResults)
            }}
          />
          {productResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
              {productResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span>{p.name}</span>
                  <span className="text-muted-foreground">{formatMoney(p.purchase_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH className="text-right">Qty</TH>
                <TH className="text-right">Cost</TH>
                <TH className="text-right">Line total</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {items.map((item) => (
                <TR key={item.product.id}>
                  <TD>{item.product.name}</TD>
                  <TD className="text-right">
                    <Input
                      type="number"
                      min={1}
                      className="w-20 text-right"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.product.id, { quantity: Number(e.target.value) })}
                    />
                  </TD>
                  <TD className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="w-24 text-right"
                      value={item.purchase_price}
                      onChange={(e) => updateItem(item.product.id, { purchase_price: Number(e.target.value) })}
                    />
                  </TD>
                  <TD className="text-right">{formatMoney(item.quantity * item.purchase_price)}</TD>
                  <TD>
                    <IconButton aria-label="Remove" onClick={() => setItems((prev) => prev.filter((i) => i.product.id !== item.product.id))}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        <div className="flex justify-end text-sm font-semibold">Total: {formatMoney(total)}</div>
      </div>
    </Modal>
  )
}
