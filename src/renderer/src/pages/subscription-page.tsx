import { useEffect, useState } from 'react'
import { Card, CardContent } from '@renderer/components/ui/card'
import { StatusBadge } from '@renderer/components/ui/badge'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { formatDate, formatMoney } from '@renderer/lib/format'
import { useAppStore, type SubscriptionInfo } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }): React.JSX.Element {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {limit ?? '∞'}
        </span>
      </div>
      {limit && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-error' : pct >= 80 ? 'bg-warning' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

export function SubscriptionPage(): React.JSX.Element {
  const subscription = useAppStore((s) => s.subscription)
  const setSubscription = useAppStore((s) => s.setSubscription)
  const online = useSyncStore((s) => s.online)
  const [loading, setLoading] = useState(!subscription)

  useEffect(() => {
    if (subscription || online !== 'online') {
      setLoading(false)
      return
    }
    import('@renderer/lib/remote').then(({ remote }) =>
      remote
        .get<SubscriptionInfo>('/subscription')
        .then(({ data }) => setSubscription(data))
        .finally(() => setLoading(false))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-xl font-semibold tracking-tight">Subscription</h1>

      {online !== 'online' && !subscription ? (
        <EmptyState title="Requires internet" description="Subscription details need a connection to the server." />
      ) : loading ? (
        <LoadingState />
      ) : !subscription ? (
        <EmptyState title="No subscription data" />
      ) : (
        <>
          <Card>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="font-medium">{subscription.package.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={subscription.subscription.effective_status} />
              </div>
              {subscription.subscription.trial_ends_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trial ends</span>
                  <span>{formatDate(subscription.subscription.trial_ends_at)}</span>
                </div>
              )}
              {subscription.subscription.ends_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Renews / ends</span>
                  <span>{formatDate(subscription.subscription.ends_at)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span>
                  {formatMoney(Number(subscription.package.price), subscription.package.currency ?? 'USD')} / {subscription.package.billing_cycle}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-5">
              <p className="text-sm font-semibold">Usage</p>
              <UsageBar label="Users" used={subscription.usage.users.used} limit={subscription.usage.users.limit} />
              <UsageBar label="Branches" used={subscription.usage.branches.used} limit={subscription.usage.branches.limit} />
              <UsageBar label="Devices" used={subscription.usage.devices.used} limit={subscription.usage.devices.limit} />
            </CardContent>
          </Card>

          {subscription.package.features.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <p className="mb-2 text-sm font-semibold">Included features</p>
                <div className="flex flex-wrap gap-1.5">
                  {subscription.package.features.map((f) => (
                    <span key={f} className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">
                      {f.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
