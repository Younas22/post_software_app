import { useCallback, useEffect, useRef, useState } from 'react'
import { ProductSearchPanel } from '@renderer/components/pos/product-search-panel'
import { CartPanel } from '@renderer/components/pos/cart-panel'
import { PaymentModal } from '@renderer/components/pos/payment-modal'
import { SaleSuccessModal } from '@renderer/components/pos/sale-success-modal'
import { CustomerPickerModal } from '@renderer/components/pos/customer-picker-modal'
import { QuickCreateProductModal } from '@renderer/components/pos/quick-create-product-modal'
import { Modal } from '@renderer/components/ui/modal'
import { Button } from '@renderer/components/ui/button'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { usePosStore } from '@renderer/lib/stores/posStore'
import { useBarcodeScanner } from '@renderer/lib/useBarcodeScanner'
import { toast } from '@renderer/lib/stores/toastStore'
import type { Product } from '@shared/types'
import type { SaleCreateResult } from '@shared/preload-api'

type DialogState = 'none' | 'payment' | 'success' | 'customer' | 'not-found' | 'quick-create'

export function PosPage(): React.JSX.Element {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<DialogState>('none')
  const [lastResult, setLastResult] = useState<SaleCreateResult | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [notFoundBarcode, setNotFoundBarcode] = useState('')
  const [catalogVersion, setCatalogVersion] = useState(0)

  const hasPermission = useAuthStore((s) => s.hasPermission)
  const { addProduct, updateQuantity, removeLine, lines, setCustomer, clear } = usePosStore()

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [])

  function handleSelectProduct(product: Product): void {
    addProduct(product)
    setSelectedProductId(product.id)
    focusSearch()
  }

  const handleScan = useCallback(async (barcode: string) => {
    const product = await window.pos.catalog.getProductByBarcode(barcode)
    if (product) {
      handleSelectProduct(product)
    } else {
      setNotFoundBarcode(barcode)
      setDialog('not-found')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useBarcodeScanner(handleScan, dialog === 'none')

  // Keyboard shortcuts (Phase 08).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'F2') {
        e.preventDefault()
        focusSearch()
      } else if (e.key === 'F4') {
        e.preventDefault()
        if (lines.length > 0 && dialog === 'none') setDialog('payment')
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (dialog === 'none') setDialog('customer')
      } else if (e.key === 'Escape') {
        if (dialog !== 'none') setDialog('none')
      } else if (e.key === 'Delete' && selectedProductId !== null && dialog === 'none') {
        removeLine(selectedProductId)
        setSelectedProductId(null)
      } else if ((e.key === '+' || e.key === '=') && selectedProductId !== null && dialog === 'none') {
        const line = lines.find((l) => l.product.id === selectedProductId)
        if (line) updateQuantity(selectedProductId, line.quantity + 1)
      } else if (e.key === '-' && selectedProductId !== null && dialog === 'none') {
        const line = lines.find((l) => l.product.id === selectedProductId)
        if (line) updateQuantity(selectedProductId, line.quantity - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dialog, lines, selectedProductId, focusSearch, removeLine, updateQuantity])

  if (!hasPermission('sales.create')) {
    return <div className="p-6 text-sm text-muted-foreground">You don't have permission to use the POS.</div>
  }

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_384px]">
      <ProductSearchPanel ref={searchInputRef} onSelect={handleSelectProduct} refreshKey={catalogVersion} />
      <CartPanel
        selectedProductId={selectedProductId}
        onSelectLine={setSelectedProductId}
        onOpenCustomer={() => setDialog('customer')}
        onCheckout={() => setDialog('payment')}
      />

      {dialog === 'payment' && (
        <PaymentModal
          onClose={() => setDialog('none')}
          onComplete={(result) => {
            setLastResult(result)
            setDialog('success')
            // Local inventory was just deducted — reload the cards so they show the new stock.
            setCatalogVersion((v) => v + 1)
          }}
        />
      )}

      {dialog === 'success' && lastResult && (
        <SaleSuccessModal
          result={lastResult}
          onClose={() => {
            clear()
            setSelectedProductId(null)
            setDialog('none')
            focusSearch()
          }}
        />
      )}

      {dialog === 'customer' && (
        <CustomerPickerModal
          onClose={() => setDialog('none')}
          onSelect={(customer) => {
            setCustomer(customer)
            setDialog('none')
            focusSearch()
          }}
        />
      )}

      {dialog === 'not-found' && (
        <Modal
          open
          onClose={() => setDialog('none')}
          title="Product not found"
          description={`No product matches barcode ${notFoundBarcode}.`}
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog('none')}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => { setDialog('none'); focusSearch() }}>
                Search
              </Button>
              {hasPermission('products.create') && <Button onClick={() => setDialog('quick-create')}>Create product</Button>}
            </>
          }
        >
          <span className="sr-only">Product not found</span>
        </Modal>
      )}

      {dialog === 'quick-create' && (
        <QuickCreateProductModal
          barcode={notFoundBarcode}
          onClose={() => setDialog('none')}
          onCreated={(product) => {
            toast({ variant: 'success', title: 'Product created' })
            setCatalogVersion((v) => v + 1)
            handleSelectProduct(product)
            setDialog('none')
          }}
        />
      )}
    </div>
  )
}
