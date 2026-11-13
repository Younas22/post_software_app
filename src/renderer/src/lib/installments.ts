/**
 * Installment (easy-payment) plans — online-only (they live on the server,
 * GET/POST /installments*), for business types with the `installments`
 * module. Shapes mirror the Laravel InstallmentPlanController exactly.
 */

export type InstallmentFrequency = 'weekly' | 'biweekly' | 'monthly'
export type InstallmentPlanStatus = 'active' | 'completed' | 'cancelled'
export type InstallmentScheduleStatus = 'paid' | 'partial' | 'overdue' | 'due' | 'upcoming'

export interface InstallmentSchedule {
  id: number
  sequence: number
  due_date: string
  amount: string
  paid_amount: string
  status: InstallmentScheduleStatus
}

export interface InstallmentPayment {
  id: number
  receipt_number: string
  amount: string
  discount?: string
  fine?: string
  payment_date: string
  is_down_payment: boolean
  reference: string | null
  payment_method?: { id: number; name: string } | null
  user?: { id: number; name: string } | null
  recovery_officer?: { id: number; name: string } | null
}

export interface InstallmentPlan {
  id: number
  plan_number: string
  subtotal: string
  markup_percent: string
  total_amount: string
  down_payment: string
  financed_amount: string
  installments_count: number
  frequency: InstallmentFrequency
  installment_amount: string
  start_date: string
  paid_amount: string
  discount_amount?: string
  fine_amount?: string
  balance: string
  progress: number
  status: InstallmentPlanStatus
  guarantor_name: string | null
  guarantor_phone: string | null
  guarantor_cnic: string | null
  guarantor_address: string | null
  customer_cnic: string | null
  notes: string | null
  next_due_date?: string | null
  overdue_amount?: string
  paid_installments?: number
  customer?: {
    id: number
    name: string
    phone: string | null
    address?: string | null
    guardian_relation?: 'S/O' | 'D/O' | 'W/O' | null
    guardian_name?: string | null
    has_photo?: boolean
  }
  recovery_officer?: { id: number; name: string } | null
  branch?: { id: number; name: string }
  items?: Array<{ id: number; product_id: number; quantity: number; unit_price: string; line_total: string; serial_number: string | null; product?: { name: string } | null }>
  schedules?: InstallmentSchedule[]
  payments?: InstallmentPayment[]
}

export interface InstallmentDueRow {
  id: number
  installment_plan_id: number
  plan_number: string | null
  customer: { id: number; name: string; phone: string | null } | null
  sequence: number
  due_date: string
  remaining: string
  status: InstallmentScheduleStatus
}

export interface InstallmentSummary {
  active_count: number
  completed_count: number
  outstanding: string
  overdue_amount: string
  overdue_plans: number
  due_today: string
  due_this_week: string
  collected_today: string
  collected_this_month: string
  upcoming: InstallmentDueRow[]
  overdue: InstallmentDueRow[]
}

export const FREQUENCY_LABEL: Record<InstallmentFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly'
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Mirrors InstallmentService::dueDate() — month steps never overflow into the next month. */
export function addPeriod(start: string, frequency: InstallmentFrequency, steps: number): string {
  const [y, m, d] = start.split('-').map(Number)
  const base = new Date(y, (m || 1) - 1, d || 1)
  if (frequency !== 'monthly') {
    base.setDate(base.getDate() + steps * (frequency === 'weekly' ? 7 : 14))
    return isoDate(base)
  }
  const target = new Date(base.getFullYear(), base.getMonth() + steps, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(base.getDate(), lastDay))
  return isoDate(target)
}

export function daysFromToday(date: string): number {
  const t = new Date()
  const today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86_400_000)
}

export function relativeDue(date: string): string {
  const days = daysFromToday(date)
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days > 1) return `In ${days} days`
  if (days === -1) return '1 day late'
  return `${Math.abs(days)} days late`
}
