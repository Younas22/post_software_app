import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { SubscriptionBanner } from './subscription-banner'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { remote } from '@renderer/lib/remote'

export function AppShell(): React.JSX.Element {
  const setSubscription = useAppStore((s) => s.setSubscription)
  const online = useSyncStore((s) => s.online)

  useEffect(() => {
    if (online !== 'online') return
    let cancelled = false
    remote
      .get('/subscription')
      .then(({ data }) => {
        if (!cancelled) setSubscription(data as never)
      })
      .catch(() => {
        // Subscription visibility is informational only — a failure here
        // never blocks the app (Laravel still enforces limits server-side
        // on every real write, per Phase 12).
      })
    return () => {
      cancelled = true
    }
  }, [online, setSubscription])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <SubscriptionBanner />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
