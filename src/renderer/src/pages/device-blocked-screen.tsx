import { ShieldAlert } from 'lucide-react'
import { AuthLayout } from './auth-layout'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import { useAuthStore } from '@renderer/lib/stores/authStore'

export function DeviceBlockedScreen({ message, onSignOut }: { message: string; onSignOut: () => void }): React.JSX.Element {
  const user = useAuthStore((s) => s.user)
  return (
    <AuthLayout title="Device access restricted">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <ShieldAlert className="size-8 text-error" />
        <Alert variant="error">{message}</Alert>
        {user && <p className="text-xs text-muted-foreground">Signed in as {user.email}</p>}
        <Button variant="outline" className="w-full" onClick={onSignOut}>
          Sign out
        </Button>
        <p className="text-xs text-muted-foreground">You&apos;ll be asked to register this device again after signing back in.</p>
      </div>
    </AuthLayout>
  )
}
