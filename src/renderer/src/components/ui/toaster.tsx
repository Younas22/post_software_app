import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@renderer/lib/stores/toastStore'
import { cn } from '@renderer/lib/cn'

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info }
const CLASSES = {
  success: 'border-success/30 [&_svg]:text-success',
  error: 'border-error/30 [&_svg]:text-error',
  warning: 'border-warning/30 [&_svg]:text-warning',
  info: 'border-info/30 [&_svg]:text-info'
}

export function Toaster(): React.JSX.Element {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            className={cn(
              'toast-enter pointer-events-auto flex items-start gap-2.5 rounded-md border bg-card px-3.5 py-3 text-card-foreground shadow-md',
              CLASSES[t.variant]
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
