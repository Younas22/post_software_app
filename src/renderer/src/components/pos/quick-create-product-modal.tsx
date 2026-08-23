import { useState } from 'react'
import { Modal } from '@renderer/components/ui/modal'
import { Button } from '@renderer/components/ui/button'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { remote, RemoteError } from '@renderer/lib/remote'
import type { Product } from '@shared/types'

export function QuickCreateProductModal({
  barcode,
  onClose,
  onCreated
}: {
  barcode: string
  onClose: () => void
  onCreated: (product: Product) => void
}): React.JSX.Element {
  const [name, setName] = useState('')
  const [salePrice, setSalePrice] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  async function submit(): Promise<void> {
    setSaving(true)
    setErrors({})
    try {
      const { data } = await remote.post<Product>('/products', { name, barcode, sale_price: salePrice })
      // Cache it locally right away — otherwise checkout would fail with
      // "product not found" until the next sync cycle pulls it down.
      await window.pos.catalog.upsertLocalProduct(data)
      onCreated(data)
    } catch (err) {
      if (err instanceof RemoteError) setErrors(err.errors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create product"
      description={`Barcode ${barcode} was not found in the catalog.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create & add to cart
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required error={errors.name?.[0]}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Sale price" required error={errors.sale_price?.[0]}>
          <Input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} />
        </Field>
      </div>
    </Modal>
  )
}
