import type { HTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'brand'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-muted text-muted-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error: 'bg-error-soft text-error',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand-soft text-brand'
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  active: 'success',
  completed: 'success',
  synced: 'success',
  received: 'success',
  paid: 'success',
  trial: 'info',
  pending: 'warning',
  syncing: 'info',
  inactive: 'neutral',
  cancelled: 'neutral',
  void: 'neutral',
  expired: 'error',
  suspended: 'error',
  blocked: 'error',
  failed: 'error',
  conflict: 'error'
}

export function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const variant = STATUS_MAP[status.toLowerCase()] ?? 'neutral'
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>
}
