import { Receipt } from 'lucide-react'
import { ResourceCrudPage, type FilterConfig } from '@renderer/components/data/resource-crud-page'
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

// Matches post_software_web/src/components/expenses/expense-form.tsx's CATEGORIES
// exactly — this is a fixed list on both platforms, not a backend-driven lookup
// (Expense.category is a free-text column with no dedicated categories table).
const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Maintenance', 'Marketing', 'Transport', 'Other']

const columns: ColumnConfig<ExpenseRow>[] = [
  { header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
  { header: 'Category', render: (r) => r.category },
  { header: 'Date', render: (r) => formatDate(r.expense_date) },
  { header: 'Amount', render: (r) => formatMoney(r.amount), className: 'text-right' }
]

const filters: FilterConfig[] = [
  { name: 'category', label: 'Category', options: CATEGORIES.map((c) => ({ value: c, label: c })) }
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
      filters={filters}
      canCreate={hasPermission('expenses.create')}
      canEdit={hasPermission('expenses.update')}
      canDelete={hasPermission('expenses.delete')}
      formFields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'select', required: true, options: CATEGORIES.map((c) => ({ value: c, label: c })) },
        { name: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
        { name: 'expense_date', label: 'Date', type: 'date', required: true },
        { name: 'notes', label: 'Notes', type: 'textarea' }
      ]}
    />
  )
}
