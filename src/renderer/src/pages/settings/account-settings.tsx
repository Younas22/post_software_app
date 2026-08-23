import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { remote, RemoteError } from '@renderer/lib/remote'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'

export function AccountSettings(): React.JSX.Element {
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({})
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({})
  const [savingPassword, setSavingPassword] = useState(false)

  async function saveProfile(): Promise<void> {
    setSavingProfile(true)
    setProfileErrors({})
    try {
      await remote.put('/user/profile', { name, email })
      toast({ variant: 'success', title: 'Profile updated' })
      const refreshed = await window.pos.auth.refreshUser()
      if (refreshed) setSession(refreshed)
    } catch (err) {
      if (err instanceof RemoteError) setProfileErrors(err.errors)
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(): Promise<void> {
    setSavingPassword(true)
    setPasswordErrors({})
    try {
      await remote.put('/user/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword
      })
      toast({ variant: 'success', title: 'Password updated' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (err instanceof RemoteError) setPasswordErrors(err.errors)
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name" error={profileErrors.name?.[0]} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" error={profileErrors.email?.[0]} required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button onClick={saveProfile} loading={savingProfile}>
            Save profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Current password" error={passwordErrors.current_password?.[0]} required>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
          <Field label="New password" error={passwordErrors.password?.[0]} required>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password" required>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </Field>
          <Button onClick={savePassword} loading={savingPassword}>
            Update password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
