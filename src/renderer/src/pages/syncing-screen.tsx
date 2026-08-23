import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AuthLayout } from './auth-layout'
import { Button } from '@renderer/components/ui/button'
import { useSyncStore } from '@renderer/lib/stores/syncStore'

const PHASE_LABELS: Record<string, string> = {
  idle: 'Preparing...',
  preparing: 'Preparing device...',
  categories: 'Syncing categories...',
  products: 'Downloading products...',
  customers: 'Syncing customers...',
  inventory: 'Updating inventory...',
  sales: 'Syncing sales...',
  finalizing: 'Finalizing...',
  ready: 'Ready',
  error: 'Sync failed'
}

export function SyncingScreen({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const progress = useSyncStore((s) => s.progress)
  const phase = progress?.phase ?? 'preparing'
  const isError = phase === 'error'

  return (
    <AuthLayout title="Setting up your device" subtitle="Downloading the data this terminal needs to work offline.">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {isError ? (
          <AlertTriangle className="size-8 text-error" />
        ) : phase === 'ready' ? (
          <CheckCircle2 className="size-8 text-success" />
        ) : (
          <Loader2 className="size-8 animate-spin text-brand" />
        )}
        <div>
          <p className="text-sm font-medium">{progress?.message ?? PHASE_LABELS[phase]}</p>
          {progress?.total !== undefined && progress.current !== undefined && (
            <p className="mt-1 text-xs text-muted-foreground">
              {progress.current} / {progress.total}
            </p>
          )}
        </div>
        {isError && <Button onClick={onRetry}>Retry</Button>}
      </div>
    </AuthLayout>
  )
}
