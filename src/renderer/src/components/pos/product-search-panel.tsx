import { forwardRef, useEffect, useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { SearchInput } from '@renderer/components/ui/search-input'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatMoney } from '@renderer/lib/format'
import { cn } from '@renderer/lib/cn'
import type { Category, Product } from '@shared/types'

interface ProductSearchPanelProps {
  onSelect: (product: Product) => void
}

export const ProductSearchPanel = forwardRef<HTMLInputElement, ProductSearchPanelProps>(({ onSelect }, ref) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)

  useEffect(() => {
    void window.pos.catalog.listCategories().then(setCategories)
  }, [])

  useEffect(() => {
    void window.pos.catalog.searchProducts(query).then(setResults)
  }, [query])

  const visible = categoryId ? results.filter((p) => p.category_id === categoryId) : results

  return (
    <div className="flex h-full flex-col">
      {/* h-16 matches CartPanel's header exactly, so both columns' content starts at the same baseline. */}
      <div className="flex h-16 items-center border-b border-border px-5">
        <SearchInput ref={ref} placeholder="Search products, or scan barcode (F2)" autoFocus onSearch={setQuery} />
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-3">
          <button
            onClick={() => setCategoryId(null)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              categoryId === null ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                categoryId === c.id ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {visible.length === 0 ? (
          <EmptyState icon={PackageSearch} title="No products found" description={query ? 'Try a different search.' : 'Start typing to search the catalog.'} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((p) => {
              const outOfStock = (p.stock_quantity ?? 0) <= 0
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-brand hover:bg-brand-soft/40 active:scale-[0.98]"
                >
                  <span className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</span>
                  <span className="text-base font-semibold text-brand">{formatMoney(p.sale_price)}</span>
                  <span className={`text-xs ${outOfStock ? 'font-medium text-error' : 'text-muted-foreground'}`}>
                    {outOfStock ? 'Out of stock' : `${p.stock_quantity ?? 0} in stock`}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
ProductSearchPanel.displayName = 'ProductSearchPanel'
