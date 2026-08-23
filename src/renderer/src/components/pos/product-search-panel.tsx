import { forwardRef, useEffect, useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatMoney } from '@renderer/lib/format'
import type { Product } from '@shared/types'

interface ProductSearchPanelProps {
  onSelect: (product: Product) => void
}

export const ProductSearchPanel = forwardRef<HTMLInputElement, ProductSearchPanelProps>(({ onSelect }, ref) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])

  useEffect(() => {
    void window.pos.catalog.searchProducts(query).then(setResults)
  }, [query])

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <SearchInput ref={ref} placeholder="Search products, or scan barcode (F2)" autoFocus onSearch={setQuery} />

      {results.length === 0 ? (
        <EmptyState icon={PackageSearch} title="No products found" description={query ? 'Try a different search.' : 'Start typing to search the catalog.'} />
      ) : (
        <div className="grid grid-cols-2 gap-2 overflow-y-auto pb-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => {
            const outOfStock = (p.stock_quantity ?? 0) <= 0
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="flex flex-col items-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-brand hover:bg-brand-soft/40"
              >
                <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                <span className="text-sm font-semibold text-brand">{formatMoney(p.sale_price)}</span>
                <span className={`text-xs ${outOfStock ? 'text-error' : 'text-muted-foreground'}`}>
                  {outOfStock ? 'Out of stock' : `${p.stock_quantity ?? 0} in stock`}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
})
ProductSearchPanel.displayName = 'ProductSearchPanel'
