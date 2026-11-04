import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { remote, RemoteError } from '@renderer/lib/remote'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { useRemoteImage } from '@renderer/lib/use-branding'
import { UserAvatar } from '@renderer/components/ui/user-avatar'

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
    <div className="max-w-2xl space-y-6 p-6">
      <ProfilePhotoCard />

      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
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

const MAX_PHOTO_BYTES = 2 * 1024 * 1024

/** Profile photo — uploaded through main (multipart) and shown in the top bar & profile menu. */
function ProfilePhotoCard(): React.JSX.Element {
  const user = useAuthStore((s) => s.user)
  const setSession = useAuthStore((s) => s.setSession)
  const online = useSyncStore((s) => s.online)
  const saved = useRemoteImage(user?.avatar_url)
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const role = user?.is_super_admin ? 'Super Admin' : user?.roles?.[0]?.replace(/-/g, ' ')

  async function refresh(): Promise<void> {
    const refreshed = await window.pos.auth.refreshUser()
    if (refreshed) setSession(refreshed)
  }

  async function choose(file: File | undefined): Promise<void> {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setError(null)
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Please choose a JPG, PNG or WebP image.')
    if (file.size > MAX_PHOTO_BYTES) return setError('The photo must be 2 MB or smaller.')
    const url = URL.createObjectURL(file)
    setPreview(url)
    setBusy('upload')
    try {
      const res = await window.pos.remote.upload({
        path: '/user/avatar',
        files: [{ field: 'avatar', name: file.name, type: file.type, data: await file.arrayBuffer() }]
      })
      if (!res.ok) throw new Error(res.errors?.avatar?.[0] ?? res.message ?? 'Upload failed.')
      await refresh()
      toast({ variant: 'success', title: 'Profile photo updated' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setPreview(null)
      URL.revokeObjectURL(url)
      setBusy(null)
    }
  }

  async function remove(): Promise<void> {
    setError(null)
    setBusy('remove')
    try {
      await remote.delete('/user/avatar')
      await refresh()
      toast({ variant: 'success', title: 'Profile photo removed' })
    } catch (err) {
      setError(err instanceof RemoteError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="h-20 bg-brand/90" aria-hidden />
      <div className="flex items-start gap-5 px-6 pb-6">
        <div className="relative -mt-12 shrink-0">
          <UserAvatar name={user?.name} src={preview ?? saved} size="xl" className="ring-4 ring-card" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy !== null || online !== 'online'}
            className="absolute bottom-0.5 right-0.5 flex size-9 items-center justify-center rounded-full border-2 border-card bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover disabled:opacity-60"
            aria-label="Change profile photo"
          >
            <Camera className="size-4" />
          </button>
        </div>
        <div className="min-w-0 flex-1 pt-3">
          <p className="truncate text-lg font-semibold">{user?.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {user?.email}
            {role && <span className="capitalize"> · {role}</span>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {online === 'online' ? 'JPG, PNG or WebP, up to 2 MB. A square photo looks best.' : 'Connect to the internet to change your photo.'}
          </p>
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </div>
        <div className="flex shrink-0 gap-2 pt-3">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void choose(e.target.files?.[0])} />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={busy === 'upload'} disabled={busy !== null || online !== 'online'}>
            <Camera className="size-4" /> {user?.avatar_url ? 'Change' : 'Upload'}
          </Button>
          {user?.avatar_url && (
            <Button variant="ghost" size="sm" className="text-error" onClick={() => void remove()} loading={busy === 'remove'} disabled={busy !== null || online !== 'online'}>
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
