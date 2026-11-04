import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, Wifi, WifiOff, RefreshCw, Store } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { IconButton } from '@renderer/components/ui/icon-button'
import { NotificationsBell } from './notifications-bell'
import { ProfileMenu } from './profile-menu'

function ConnectionBadge(): React.JSX.Element {
  const { online, status } = useSyncStore()
  const syncing = status?.isSyncing
  const pending = status?.pendingCount ?? 0

  const label = syncing ? 'Syncing…' : online === 'online' ? (pending > 0 ? `${pending} pending` : 'Online') : online === 'offline' ? 'Offline' : 'Connecting…'
  const Icon = syncing ? RefreshCw : online === 'online' ? Wifi : WifiOff

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        online === 'online' ? 'border-success/30 text-success' : online === 'offline' ? 'border-error/30 text-error' : 'border-border text-muted-foreground'
      )}
    >
      <Icon className={cn('size-3.5', syncing && 'animate-spin')} />
      {label}
    </div>
  )
}

export function Topbar(): React.JSX.Element {
  const { branch } = useAppStore()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    void window.pos.window.isMaximized().then(setIsMaximized)
    return window.pos.window.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <header className="app-drag flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        {branch && (
          <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
            <Store className="size-4 text-muted-foreground" />
            {branch.name}
            {branch.is_main && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">Main</span>}
          </span>
        )}
      </div>

      <div className="app-no-drag flex items-center gap-2.5">
        <ConnectionBadge />
        <NotificationsBell />
        <ProfileMenu />

        <div className="ml-1 flex items-center gap-0.5 border-l border-border pl-2">
          <IconButton aria-label="Minimize" onClick={() => window.pos.window.minimize()}>
            <Minus className="size-4" />
          </IconButton>
          <IconButton
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            onClick={() => (isMaximized ? window.pos.window.unmaximize() : window.pos.window.maximize())}
          >
            {isMaximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
          </IconButton>
          <IconButton aria-label="Close" onClick={() => window.pos.window.close()}>
            <X className="size-4" />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
