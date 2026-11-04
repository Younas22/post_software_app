import { forwardRef, useEffect, useState } from 'react'
import { ConciergeBell, Package, PackageSearch } from 'lucide-react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatMoney } from '@renderer/lib/format'
import { useTerms } from '@renderer/lib/use-branding'
import { cn } from '@renderer/lib/cn'
import type { Category, Product } from '@shared/types'

interface ProductSearchPanelProps {
  onSelect: (product: Product) => void
}

type ItemType = 'all' | 'product' | 'service'

/**
 * POS catalog — the same layout as the web POS (post_software_web
 * app/(app)/pos + components/pos/product-grid & category-rail): a category
 * rail on the left, search + item-type tabs on top, and product cards with
 * an image area, "Service" badge, SKU, price and stock. Reads the device's
 * offline SQLite catalog.
 */
export const ProductSearchPanel = forwardRef<HTMLInputElement, ProductSearchPanelProps>(({ onSelect }, ref) => {
  const terms = useTerms()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [itemType, setItemType] = useState<ItemType>('all')

  useEffect(() => {
    void window.pos.catalog.listCategories().then(setCategories)
  }, [])

  useEffect(() => {
    void window.pos.catalog.searchProducts(query).then(setResults)
  }, [query])

  const visible = results.filter(
    (p) => (categoryId === null || p.category_id === categoryId) && (itemType === 'all' || (p.type ?? 'product') === itemType)
  )

  const typeTabs: Array<{ value: ItemType; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'product', label: terms.products },
    { value: 'service', label: 'Services' }
  ]

  return (
    <div className="flex h-full min-w-0">
      {/* Category rail */}
      <aside className="w-44 shrink-0 overflow-y-auto border-r border-border px-2 py-3">
        <div className="flex flex-col gap-2">
          <CategoryButton label="All" active={categoryId === null} onClick={() => setCategoryId(null)} />
          {categories.map((c) => (
            <CategoryButton key={c.id} label={c.name} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} />
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <SearchInput ref={ref} className="flex-1" placeholder="Search or scan barcode… (F2)" autoFocus onSearch={setQuery} />
          <div className="flex shrink-0 gap-1 rounded-lg bg-muted p-0.5">
            {typeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setItemType(tab.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  itemType === tab.value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {visible.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={`No ${terms.products.toLowerCase()} found`}
              description={query ? 'Try a different search term or category.' : 'Sync this device, or try another category.'}
            />
          ) : (
            <div className="grid grid-cols-3 gap-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visible.map((p) => {
                const isService = p.type === 'service'
                // A service never has stock — never "out of stock" (same rule as the web POS).
                const stock = p.stock_quantity ?? 0
                const outOfStock = !isService && stock <= 0
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => onSelect(p)}
                    className={cn(
                      'flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-xs transition-all',
                      'hover:border-brand/50 hover:shadow-sm active:scale-[0.98]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      outOfStock && 'cursor-not-allowed opacity-50 grayscale'
                    )}
                  >
                    <div className="relative flex h-28 w-full shrink-0 items-center justify-center bg-muted">
                      {isService && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">Service</span>
                      )}
                      {isService ? <ConciergeBell className="size-8 text-muted-foreground" /> : <Package className="size-8 text-muted-foreground" />}
                    </div>
                    <div className="flex w-full flex-1 flex-col gap-0.5 p-2.5">
                      <p className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku}</p>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 pt-1">
                        <span className="text-sm font-semibold text-brand">{formatMoney(p.sale_price)}</span>
                        {!isService && (
                          <span className={cn('shrink-0 text-xs', outOfStock ? 'text-error' : 'text-muted-foreground')}>
                            {outOfStock ? 'Out of stock' : `${stock} left`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
ProductSearchPanel.displayName = 'ProductSearchPanel'

function CategoryButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full shrink-0 rounded-lg px-3.5 py-2 text-left text-sm font-medium transition-colors',
        active ? 'bg-brand text-brand-foreground' : 'bg-muted text-foreground hover:bg-border/70'
      )}
    >
      {label}
    </button>
  )
}
