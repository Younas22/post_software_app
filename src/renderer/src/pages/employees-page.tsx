import { UserCog } from 'lucide-react'
import { ResourceCrudPage, statusBadgeColumn } from '@renderer/components/data/resource-crud-page'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import type { ColumnConfig } from '@renderer/components/data/field-config'

interface EmployeeRow {
  id: number
  name: string
  email: string
  status: string
  roles: string[]
  branch?: { name: string } | null
}

const ROLE_OPTIONS = [
  { value: 'business-admin', label: 'Business Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'cashier', label: 'Cashier' }
]

const columns: ColumnConfig<EmployeeRow>[] = [
  { header: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
  { header: 'Email', render: (r) => r.email },
  { header: 'Role', render: (r) => r.roles?.[0]?.replace(/-/g, ' ') ?? '—' },
  { header: 'Branch', render: (r) => r.branch?.name ?? '—' },
  statusBadgeColumn()
]

export function EmployeesPage(): React.JSX.Element {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const business = useAppStore((s) => s.business)

  return (
    <ResourceCrudPage<EmployeeRow>
      title="Employees"
      description="Staff accounts for this business."
      path="/employees"
      searchPlaceholder="Search employees..."
      emptyIcon={UserCog}
      columns={columns}
      canCreate={hasPermission('users.create')}
      canEdit={hasPermission('users.update')}
      canDelete={false}
      activation={{
        activatePath: (row) => `/employees/${row.id}/activate`,
        deactivatePath: (row) => `/employees/${row.id}/deactivate`
      }}
      toFormValues={(row) => ({ name: row.name, email: row.email, role: row.roles?.[0] ?? '' })}
      transformPayload={(values) => {
        // Bug #1 from ELECTRON_DESKTOP_APP_HANDOFF.md §5 — POST /employees
        // does not default business_id to the creator's own business, so
        // it must be sent explicitly or the new user ends up business-less.
        const payload: Record<string, unknown> = { ...values, business_id: business?.id }
        if (values.role) payload.roles = [values.role]
        return payload
      }}
      formFields={[
        { name: 'name', label: 'Full name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'password', label: 'Password', type: 'text', hint: 'Min 10 chars, upper + lower case, a number and a symbol. Leave blank when editing to keep unchanged.' },
        { name: 'role', label: 'Role', type: 'select', required: true, options: ROLE_OPTIONS }
      ]}
    />
  )
}
