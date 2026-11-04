import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { ResourceCrudPage, statusBadgeColumn, type FilterConfig } from '@renderer/components/data/resource-crud-page'
import { Tabs } from '@renderer/components/ui/tabs'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { remote } from '@renderer/lib/remote'
import { formatMoney } from '@renderer/lib/format'
import type { ColumnConfig } from '@renderer/components/data/field-config'
import { useTerms } from '@renderer/lib/use-branding'

interface ProductRow {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  category_id: number | null
  sale_price: number
  stock?: number
  status: string
}

interface CategoryRow {
  id: number
  name: string
  status: string
}

export function ProductsPage(): React.JSX.Element {
  const terms = useTerms()
  const [tab, setTab] = useState<'products' | 'categories'>('products')
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [categories, setCategories] = useState<CategoryRow[]>([])

  useEffect(() => {
    remote
      .get<CategoryRow[]>('/categories', { per_page: 200 })
      .then(({ data }) => setCategories(data))
      .catch(() => setCategories([]))
  }, [tab])

  const productColumns: ColumnConfig<ProductRow>[] = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { header: 'SKU', render: (r) => r.sku ?? '—' },
    { header: 'Barcode', render: (r) => r.barcode ?? '—' },
    { header: 'Price', render: (r) => formatMoney(r.sale_price), className: 'text-right' },
    { header: 'Stock', render: (r) => (r.stock !== undefined ? r.stock : '—'), className: 'text-right' },
    statusBadgeColumn()
  ]

  const categoryColumns: ColumnConfig<CategoryRow>[] = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    statusBadgeColumn()
  ]

  const productFilters: FilterConfig[] = [
    {
      name: 'category_id',
      label: 'Category',
      options: categories.map((c) => ({ value: String(c.id), label: c.name }))
    },
    {
      name: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ]

  return (
    <div>
      <div className="px-6 pt-4">
        <Tabs
          items={[
            { value: 'products', label: 'Products' },
            { value: 'categories', label: 'Categories' }
          ]}
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
        />
      </div>

      {tab === 'products' ? (
        <div>
          <ResourceCrudPage<ProductRow>
            title={terms.products}
            path="/products"
            searchPlaceholder="Search by name, SKU or barcode..."
            emptyIcon={Package}
            columns={productColumns}
            filters={productFilters}
            canCreate={hasPermission('products.create')}
            canEdit={hasPermission('products.update')}
            canDelete={hasPermission('products.delete')}
            formFields={[
              { name: 'name', label: 'Name', type: 'text', required: true },
              { name: 'sku', label: 'SKU', type: 'text' },
              { name: 'barcode', label: 'Barcode', type: 'text' },
              {
                name: 'category_id',
                label: 'Category',
                type: 'select',
                options: categories.map((c) => ({ value: String(c.id), label: c.name }))
              },
              { name: 'sale_price', label: 'Sale price', type: 'number', step: '0.01', required: true },
              { name: 'purchase_price', label: 'Purchase price', type: 'number', step: '0.01' },
              { name: 'tax_rate', label: 'Tax rate (%)', type: 'number', step: '0.01' },
              { name: 'unit', label: 'Unit', type: 'text', placeholder: 'pcs' },
              { name: 'minimum_stock', label: 'Minimum stock', type: 'number' }
            ]}
          />
        </div>
      ) : (
        <div>
          <ResourceCrudPage<CategoryRow>
            title={terms.categories}
            path="/categories"
            searchPlaceholder={`Search ${terms.categories.toLowerCase()}...`}
            columns={categoryColumns}
            canCreate={hasPermission('products.create')}
            canEdit={hasPermission('products.update')}
            canDelete={hasPermission('products.delete')}
            formFields={[{ name: 'name', label: 'Name', type: 'text', required: true }]}
          />
        </div>
      )}
    </div>
  )
}
