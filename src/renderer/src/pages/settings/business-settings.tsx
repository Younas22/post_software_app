import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { remote, RemoteError } from '@renderer/lib/remote'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { refreshBusinessContext } from '@renderer/lib/business'

interface BusinessDetail {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  currency: string
  timezone: string
}

/** GET /business/locale-options — the currencies/timezones the Super Admin has enabled. */
interface LocaleOptions {
  currencies: Array<{ code: string; label: string }>
  timezones: Array<{ id: string; label: string }>
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

  const [locale, setLocale] = useState<LocaleOptions | null>(null)
  const logo = useAppStore((s) => s.business?.logo_data ?? null)

  const [registry, setRegistry] = useState<Record<string, string>>({})
  const [savingRegistry, setSavingRegistry] = useState(false)

  useEffect(() => {
    remote
      .get<BusinessDetail>('/business')
      .then(({ data }) => setBusiness(data))
      .catch(() => setBusiness(null))
      .finally(() => setLoading(false))
    remote
      .get<LocaleOptions>('/business/locale-options')
      .then(({ data }) => setLocale(data))
      .catch(() => setLocale(null))
  }, [])

  async function saveBusiness(): Promise<void> {
    if (!business) return
    setSaving(true)
    setErrors({})
    try {
      const { data } = await remote.put<BusinessDetail>('/business', business)
      setBusiness(data)
      // Currency/timezone/name drive formatting and branding app-wide.
      await refreshBusinessContext()
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
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="" className="size-14 rounded-lg border border-border bg-white object-contain p-1" />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-lg bg-brand-soft text-lg font-semibold text-brand">
                {business.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Your business logo appears in the sidebar and on receipts. Upload or change it from the web dashboard.</p>
          </div>
          <Field label="Name" error={errors.name?.[0]} required>
            <Input disabled={!canEdit} value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
          </Field>
          <Field label="Phone" error={errors.phone?.[0]}>
            <Input disabled={!canEdit} value={business.phone ?? ''} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} />
          </Field>
          <Field label="Email" error={errors.email?.[0]}>
            <Input disabled={!canEdit} value={business.email ?? ''} onChange={(e) => setBusiness({ ...business, email: e.target.value })} />
          </Field>
          <Field label="Currency" error={errors.currency?.[0]} required>
            <Select
              disabled={!canEdit || !locale}
              value={business.currency}
              onChange={(e) => setBusiness({ ...business, currency: e.target.value })}
            >
              {(locale?.currencies ?? [{ code: business.currency, label: business.currency }]).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Timezone" error={errors.timezone?.[0]} required>
            <Select
              disabled={!canEdit || !locale}
              value={business.timezone}
              onChange={(e) => setBusiness({ ...business, timezone: e.target.value })}
            >
              {(locale?.timezones ?? [{ id: business.timezone, label: business.timezone }]).map((tz) => (
                <option key={tz.id} value={tz.id}>
                  {tz.label}
                </option>
              ))}
            </Select>
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
