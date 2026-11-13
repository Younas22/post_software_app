import type { ReactNode } from 'react'
import { CalendarClock } from 'lucide-react'
import { OfflineReceipts } from './offline-receipts'
import { Badge } from '@renderer/components/ui/badge'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { useBranding } from '@renderer/lib/use-branding'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { cn } from '@renderer/lib/cn'

const STATUS: Record<string, { variant: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand'; label: string }> = {
  active: { variant: 'info', label: 'Active' },
  completed: { variant: 'success', label: 'Completed' },
  cancelled: { variant: 'neutral', label: 'Cancelled' },
  paid: { variant: 'success', label: 'Paid' },
  partial: { variant: 'warning', label: 'Partial' },
  overdue: { variant: 'error', label: 'Overdue' },
  due: { variant: 'warning', label: 'Due today' },
  upcoming: { variant: 'neutral', label: 'Upcoming' }
}

export function InstallmentStatusBadge({ status }: { status: string }): React.JSX.Element {
  const entry = STATUS[status] ?? { variant: 'neutral' as const, label: status }
  return <Badge variant={entry.variant}>{entry.label}</Badge>
}

export function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'error' | 'success'; className?: string }): React.JSX.Element {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', tone === 'error' ? 'bg-error' : tone === 'success' ? 'bg-success' : 'bg-brand')}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/**
 * Installments are server-side records: the module must be enabled for the
 * business type, and the screens need a connection.
 */
export function InstallmentsGate({ children }: { children: ReactNode }): React.JSX.Element {
  const { hasModule } = useBranding()
  const online = useSyncStore((s) => s.online)
  if (!hasModule('installments')) {
    return (
      <div className="p-12">
        <EmptyState
          icon={CalendarClock}
          title="Installments aren't enabled"
          description="This module is available for business types that sell on installments. Ask your administrator to enable it."
        />
      </div>
    )
  }
  if (online === 'offline') {
    // Plans need the server; receipts already opened here can still be reprinted.
    return <OfflineReceipts />
  }
  return <>{children}</>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
