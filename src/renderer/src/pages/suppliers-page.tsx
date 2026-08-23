import { Truck } from 'lucide-react'
import { ResourceCrudPage, statusBadgeColumn } from '@renderer/components/data/resource-crud-page'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import type { ColumnConfig } from '@renderer/components/data/field-config'

interface SupplierRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  status: string
}

const columns: ColumnConfig<SupplierRow>[] = [
  { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
  { header: 'Phone', render: (r) => r.phone ?? '—' },
  { header: 'Email', render: (r) => r.email ?? '—' },
  statusBadgeColumn()
]

export function SuppliersPage(): React.JSX.Element {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  return (
    <ResourceCrudPage<SupplierRow>
      title="Suppliers"
      description="Vendors this business purchases stock from."
      path="/suppliers"
      searchPlaceholder="Search suppliers..."
      emptyIcon={Truck}
      columns={columns}
      canCreate={hasPermission('suppliers.create')}
      canEdit={hasPermission('suppliers.update')}
      canDelete={hasPermission('suppliers.delete')}
      formFields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Address', type: 'textarea' }
      ]}
    />
  )
}
