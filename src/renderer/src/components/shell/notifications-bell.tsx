import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Dropdown, DropdownItem } from '@renderer/components/ui/dropdown'
import { IconButton } from '@renderer/components/ui/icon-button'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatDateTime } from '@renderer/lib/format'
import { remote } from '@renderer/lib/remote'
import { cn } from '@renderer/lib/cn'
import { useSyncStore } from '@renderer/lib/stores/syncStore'

interface NotificationRow {
  id: string
  type: string
  data: { title?: string; message?: string }
  read_at: string | null
  created_at: string
}

const POLL_MS = 60_000

export function NotificationsBell(): React.JSX.Element {
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const online = useSyncStore((s) => s.online)

  async function load(): Promise<void> {
    try {
      const { data, meta } = await remote.get<NotificationRow[]>('/notifications', { per_page: 8 })
      setItems(data)
      setUnreadCount((meta as { unread_count?: number } | undefined)?.unread_count ?? 0)
    } catch {
      // Notifications are informational only — a failed poll (e.g. offline)
      // just leaves the last-known list showing, never surfaces an error.
    }
  }

  useEffect(() => {
    if (online !== 'online') return
    void load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [online])

  async function markAllRead(): Promise<void> {
    await remote.patch('/notifications/read-all')
    void load()
  }

  return (
    <Dropdown
      align="right"
      trigger={
        <IconButton aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`} className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-error" />}
        </IconButton>
      }
    >
      {(close) => (
        <div className="w-80">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  void markAllRead()
                }}
                className="text-xs font-medium text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto border-t border-border pt-1">
            {items.length === 0 ? (
              <EmptyState title="No notifications" description="You're all caught up." />
            ) : (
              items.map((n) => (
                <DropdownItem
                  key={n.id}
                  onClick={async () => {
                    if (!n.read_at) await remote.patch(`/notifications/${n.id}/read`)
                    close()
                    void load()
                  }}
                >
                  <span className={cn('flex w-full flex-col items-start gap-0.5', !n.read_at && 'font-medium')}>
                    <span className="text-sm">{n.data.title ?? n.type}</span>
                    {n.data.message && <span className="text-xs text-muted-foreground">{n.data.message}</span>}
                    <span className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</span>
                  </span>
                </DropdownItem>
              ))
            )}
          </div>
        </div>
      )}
    </Dropdown>
  )
}
