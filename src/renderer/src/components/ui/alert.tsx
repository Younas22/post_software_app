import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@renderer/lib/cn'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const ICONS: Record<AlertVariant, typeof Info> = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle }
const CLASSES: Record<AlertVariant, string> = {
  info: 'bg-info-soft text-info border-info/20',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  error: 'bg-error-soft text-error border-error/20'
}

export function Alert({ variant = 'info', title, children }: { variant?: AlertVariant; title?: string; children?: ReactNode }): React.JSX.Element {
  const Icon = ICONS[variant]
  return (
    <div className={cn('flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm', CLASSES[variant])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-current/90 mt-0.5">{children}</div>}
      </div>
    </div>
  )
}
