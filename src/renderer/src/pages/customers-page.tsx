import { Users } from 'lucide-react'
import { ResourceCrudPage, statusBadgeColumn, type FilterConfig } from '@renderer/components/data/resource-crud-page'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import type { ColumnConfig } from '@renderer/components/data/field-config'
import { useTerms } from '@renderer/lib/use-branding'

interface CustomerRow {
  id: number
  name: string
  phone: string | null
  email: string | null
  status: string
}

const columns: ColumnConfig<CustomerRow>[] = [
  { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
  { header: 'Phone', render: (r) => r.phone ?? '—' },
  { header: 'Email', render: (r) => r.email ?? '—' },
  statusBadgeColumn()
]

const filters: FilterConfig[] = [
  {
    name: 'status',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]
  }
]

export function CustomersPage(): React.JSX.Element {
  const terms = useTerms()
  const hasPermission = useAuthStore((s) => s.hasPermission)

  return (
    <ResourceCrudPage<CustomerRow>
      title={terms.customers}
      description={`Every ${terms.customer.toLowerCase()} of this business.`}
      path="/customers"
      searchPlaceholder={`Search ${terms.customers.toLowerCase()}...`}
      emptyIcon={Users}
      columns={columns}
      filters={filters}
      canCreate={hasPermission('customers.create')}
      canEdit={hasPermission('customers.update')}
      canDelete={hasPermission('customers.delete')}
      formFields={[
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Address', type: 'textarea' }
      ]}
    />
  )
}
