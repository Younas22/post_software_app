import { useState, type FormEvent } from 'react'
import { AuthLayout } from './auth-layout'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'

export function LoginPage({ onSuccess }: { onSuccess: () => void | Promise<void> }): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setSession = useAuthStore((s) => s.setSession)
  const online = useSyncStore((s) => s.online)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await window.pos.auth.login(email, password)
      setSession(session.user)
      // Login only proves the user's identity — device registration,
      // sync state, and subscription/device authorization still need to be
      // (re-)evaluated before the app is actually usable, same as a normal
      // app-start restore. See App.tsx's evaluateDevice().
      await onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Universal POS — Desktop">
      {online === 'offline' && (
        <Alert variant="warning" title="No connection">
          Signing in for the first time on this device requires an internet connection.
        </Alert>
      )}
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}
        <Field label="Email" required>
          <Input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" required>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" loading={loading} disabled={online === 'offline'}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
