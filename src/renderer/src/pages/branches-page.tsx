import { Building2 } from 'lucide-react'
import { ResourceCrudPage, statusBadgeColumn } from '@renderer/components/data/resource-crud-page'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import type { ColumnConfig } from '@renderer/components/data/field-config'

interface BranchRow {
  id: number
  name: string
  code: string | null
  is_main: boolean
  status: string
}

const columns: ColumnConfig<BranchRow>[] = [
  { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
  { header: 'Code', render: (r) => r.code ?? '—' },
  { header: 'Main', render: (r) => (r.is_main ? 'Yes' : '—') },
  statusBadgeColumn()
]

export function BranchesPage(): React.JSX.Element {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  return (
    <ResourceCrudPage<BranchRow>
      title="Branches"
      description="Physical locations this business operates."
      path="/branches"
      searchPlaceholder="Search branches..."
      emptyIcon={Building2}
      columns={columns}
      canCreate={hasPermission('businesses.update')}
      canEdit={hasPermission('businesses.update')}
      canDelete={false}
      activation={{
        activatePath: (row) => `/branches/${row.id}/activate`,
        deactivatePath: (row) => `/branches/${row.id}/deactivate`
      }}
      formFields={[
        { name: 'name', label: 'Branch name', type: 'text', required: true },
        { name: 'code', label: 'Code', type: 'text' },
        { name: 'address', label: 'Address', type: 'textarea' },
        { name: 'phone', label: 'Phone', type: 'tel' }
      ]}
    />
  )
}
