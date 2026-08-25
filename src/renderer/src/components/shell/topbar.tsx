import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X, Wifi, WifiOff, RefreshCw, Sun, Moon, Monitor, LogOut, User, FileClock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@renderer/lib/cn'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { useThemeStore, type ThemeChoice } from '@renderer/lib/stores/themeStore'
import { Dropdown, DropdownItem } from '@renderer/components/ui/dropdown'
import { IconButton } from '@renderer/components/ui/icon-button'
import { NotificationsBell } from './notifications-bell'

const THEME_ICONS: Record<ThemeChoice, typeof Sun> = { light: Sun, dark: Moon, system: Monitor }

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
  const navigate = useNavigate()
  const { user, setSession } = useAuthStore()
  const { branch, business } = useAppStore()
  const { theme, setTheme } = useThemeStore()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    void window.pos.window.isMaximized().then(setIsMaximized)
    return window.pos.window.onMaximizeChange(setIsMaximized)
  }, [])

  const ThemeIcon = THEME_ICONS[theme]

  return (
    <header className="app-drag flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-semibold">{business?.name ?? 'Universal POS'}</span>
        {branch && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{branch.name}</span>
        )}
      </div>

      <div className="app-no-drag flex items-center gap-2.5">
        <ConnectionBadge />
        <NotificationsBell />

        <Dropdown
          align="right"
          trigger={
            <IconButton aria-label="Change theme">
              <ThemeIcon className="size-4" />
            </IconButton>
          }
        >
          {(close) => (
            <>
              {(['light', 'dark', 'system'] as const).map((t) => (
                <DropdownItem
                  key={t}
                  onClick={() => {
                    setTheme(t)
                    close()
                  }}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </DropdownItem>
              ))}
            </>
          )}
        </Dropdown>

        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
              <span className="max-w-32 truncate text-sm font-medium">{user?.name}</span>
            </button>
          }
        >
          {(close) => (
            <>
              <DropdownItem
                onClick={() => {
                  navigate('/settings/account')
                  close()
                }}
              >
                <User className="size-4" /> Account
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  navigate('/settings/sync')
                  close()
                }}
              >
                <FileClock className="size-4" /> Sync status
              </DropdownItem>
              <DropdownItem
                danger
                onClick={async () => {
                  close()
                  await window.pos.auth.logout()
                  setSession(null)
                }}
              >
                <LogOut className="size-4" /> Sign out
              </DropdownItem>
            </>
          )}
        </Dropdown>

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
