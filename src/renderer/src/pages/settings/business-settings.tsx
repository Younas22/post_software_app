import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { remote, RemoteError } from '@renderer/lib/remote'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'

interface BusinessDetail {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  currency: string
  timezone: string
}

const REGISTRY_KEYS = [
  { key: 'tax_rate', label: 'Default tax rate (%)' },
  { key: 'invoice_prefix', label: 'Invoice prefix' },
  { key: 'receipt_footer', label: 'Receipt footer text' },
  { key: 'language', label: 'Language' },
  { key: 'date_format', label: 'Date format' }
]

export function BusinessSettings(): React.JSX.Element {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<BusinessDetail | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)

  const [registry, setRegistry] = useState<Record<string, string>>({})
  const [savingRegistry, setSavingRegistry] = useState(false)

  useEffect(() => {
    remote
      .get<BusinessDetail>('/business')
      .then(({ data }) => setBusiness(data))
      .catch(() => setBusiness(null))
      .finally(() => setLoading(false))
  }, [])

  async function saveBusiness(): Promise<void> {
    if (!business) return
    setSaving(true)
    setErrors({})
    try {
      const { data } = await remote.put<BusinessDetail>('/business', business)
      setBusiness(data)
      toast({ variant: 'success', title: 'Business profile updated' })
    } catch (err) {
      if (err instanceof RemoteError) setErrors(err.errors)
    } finally {
      setSaving(false)
    }
  }

  async function saveRegistry(): Promise<void> {
    setSavingRegistry(true)
    try {
      await remote.put('/business/settings', registry)
      toast({ variant: 'success', title: 'Settings updated' })
    } catch (err) {
      toast({ variant: 'error', title: 'Could not save', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSavingRegistry(false)
    }
  }

  if (loading) return <LoadingState />
  if (!business) return <p className="p-6 text-sm text-muted-foreground">Business profile requires an internet connection and the businesses.view permission.</p>

  const canEdit = hasPermission('businesses.update')

  return (
    <div className="max-w-lg space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name" error={errors.name?.[0]} required>
            <Input disabled={!canEdit} value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
          </Field>
          <Field label="Phone" error={errors.phone?.[0]}>
            <Input disabled={!canEdit} value={business.phone ?? ''} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
          </Field>
          <Field label="Email" error={errors.email?.[0]}>
            <Input disabled={!canEdit} value={business.email ?? ''} onChange={(e) => setBusiness({ ...business, email: e.target.value })} />
          </Field>
          <Field label="Currency (ISO 3-letter)" error={errors.currency?.[0]} required>
            <Input disabled={!canEdit} maxLength={3} value={business.currency} onChange={(e) => setBusiness({ ...business, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Timezone" error={errors.timezone?.[0]} required>
            <Input disabled={!canEdit} value={business.timezone} onChange={(e) => setBusiness({ ...business, timezone: e.target.value })} />
          </Field>
          {canEdit && (
            <Button onClick={saveBusiness} loading={saving}>
              Save
            </Button>
          )}
        </CardContent>
      </Card>

      {hasPermission('settings.update') && (
        <Card>
          <CardHeader>
            <CardTitle>Receipt & tax settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {REGISTRY_KEYS.map((r) => (
              <Field key={r.key} label={r.label}>
                <Input value={registry[r.key] ?? ''} onChange={(e) => setRegistry((prev) => ({ ...prev, [r.key]: e.target.value }))} />
              </Field>
            ))}
            <Button onClick={saveRegistry} loading={savingRegistry}>
              Save settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
