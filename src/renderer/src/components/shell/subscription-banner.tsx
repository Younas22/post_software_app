import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { formatDate } from '@renderer/lib/format'

export function SubscriptionBanner(): React.JSX.Element | null {
  const subscription = useAppStore((s) => s.subscription)
  if (!subscription) return null

  const { effective_status: status, trial_ends_at } = subscription.subscription

  if (status === 'active') return null

  const messages: Record<string, string> = {
    trial: `Trial active${trial_ends_at ? ` — ends ${formatDate(trial_ends_at)}` : ''}.`,
    expired: 'Your subscription has expired. Some features may be restricted.',
    suspended: 'Your subscription is suspended. Please contact your administrator.',
    cancelled: 'Your subscription has been cancelled.'
  }

  const isWarning = status === 'trial'

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${
        isWarning ? 'bg-warning-soft text-warning' : 'bg-error-soft text-error'
      }`}
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="size-4" />
        {messages[status] ?? `Subscription status: ${status}.`}
      </span>
      <Link to="/subscription" className="font-medium underline underline-offset-2">
        View details
      </Link>
    </div>
  )
}
