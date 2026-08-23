import { Receipt } from 'lucide-react'
import { ResourceCrudPage } from '@renderer/components/data/resource-crud-page'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { formatMoney, formatDate } from '@renderer/lib/format'
import type { ColumnConfig } from '@renderer/components/data/field-config'

interface ExpenseRow {
  id: number
  title: string
  category: string
  amount: number
  expense_date: string
}

const columns: ColumnConfig<ExpenseRow>[] = [
  { header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
  { header: 'Category', render: (r) => r.category },
  { header: 'Date', render: (r) => formatDate(r.expense_date) },
  { header: 'Amount', render: (r) => formatMoney(r.amount), className: 'text-right' }
]

export function ExpensesPage(): React.JSX.Element {
  const hasPermission = useAuthStore((s) => s.hasPermission)

  return (
    <ResourceCrudPage<ExpenseRow>
      title="Expenses"
      description="Operating expenses recorded for this business."
      path="/expenses"
      searchPlaceholder="Search expenses..."
      emptyIcon={Receipt}
      columns={columns}
      canCreate={hasPermission('expenses.create')}
      canEdit={hasPermission('expenses.update')}
      canDelete={hasPermission('expenses.delete')}
      formFields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'text', required: true },
        { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
        { name: 'expense_date', label: 'Date', type: 'date', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ]}
    />
  )
}
