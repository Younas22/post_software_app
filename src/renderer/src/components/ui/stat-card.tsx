import type { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { Skeleton } from './loading-state'

const TONES = {
  default: 'bg-muted text-muted-foreground',
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error'
} as const

/**
 * KPI tile — never truncates the value: the icon sits on the label row so the
 * number gets the full width, its size follows the card's own width
 * (container queries), and a very long amount wraps instead of "PKR …".
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  loading
}: {
  label: string
  value: string
  icon: LucideIcon
  tone?: keyof typeof TONES
  hint?: string
  loading?: boolean
}): React.JSX.Element {
  return (
    <div className="@container flex flex-col rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium leading-snug text-muted-foreground">{label}</p>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="size-[18px]" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-28" />
      ) : (
        <p
          className="mt-1.5 text-lg font-bold leading-tight tracking-tight tabular-nums text-foreground [overflow-wrap:anywhere] @[12rem]:text-xl @[15rem]:text-2xl"
          title={value}
        >
          {value}
        </p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
