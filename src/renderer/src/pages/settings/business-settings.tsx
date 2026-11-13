import { useEffect, useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { remote, RemoteError } from '@renderer/lib/remote'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAuthStore } from '@renderer/lib/stores/authStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { refreshBusinessContext } from '@renderer/lib/business'
import { useRemoteImage } from '@renderer/lib/use-branding'
import { initials } from '@renderer/lib/branding'
import { useBranding } from '@renderer/lib/use-branding'

interface BusinessDetail {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  currency: string
  timezone: string
  logo_url?: string | null
  favicon_url?: string | null
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
  const { hasModule } = useBranding()

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
    // Seed the registry form with the values currently in effect.
    remote
      .get<{ settings: Record<string, unknown> }>('/config')
      .then(({ data }) =>
        setRegistry(Object.fromEntries(Object.entries(data.settings ?? {}).map(([k, v]) => [k, v == null ? '' : String(v)])))
      )
      .catch(() => undefined)
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
      const { data } = await remote.put<Record<string, unknown>>('/business/settings', registry)
      setRegistry(Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [k, v == null ? '' : String(v)])))
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
    <div className="max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BrandingAssets business={business} logoData={logo} canEdit={canEdit} onChanged={setBusiness} />
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

      {hasPermission('settings.update') && hasModule('installments') && (
        <Card>
          <CardHeader>
            <CardTitle>Installment recovery receipt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The two Urdu instructions printed under the receipt header. Write <code className="rounded bg-muted px-1">{'{day}'}</code> where the
              plan&apos;s monthly due day should appear (taken from each plan&apos;s first due date).
            </p>
            <Field label="Left instruction (Urdu)">
              <Textarea
                dir="rtl"
                rows={2}
                maxLength={500}
                value={registry.installment_receipt_note_left ?? ''}
                onChange={(e) => setRegistry((prev) => ({ ...prev, installment_receipt_note_left: e.target.value }))}
              />
            </Field>
            <Field label="Right instruction (Urdu)">
              <Textarea
                dir="rtl"
                rows={2}
                maxLength={500}
                value={registry.installment_receipt_note_right ?? ''}
                onChange={(e) => setRegistry((prev) => ({ ...prev, installment_receipt_note_right: e.target.value }))}
              />
            </Field>
            <Field label="Paper size">
              <Select
                value={registry.installment_receipt_paper || 'a5'}
                onChange={(e) => setRegistry((prev) => ({ ...prev, installment_receipt_paper: e.target.value }))}
              >
                <option value="a5">A5 portrait</option>
                <option value="a5-landscape">A5 landscape</option>
                <option value="a4">A4 portrait</option>
              </Select>
            </Field>
            <Button onClick={saveRegistry} loading={savingRegistry}>
              Save receipt settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const ASSET_RULES = {
  logo: { accept: 'image/png,image/jpeg,image/webp', types: /^image\/(png|jpeg|webp)$/, maxBytes: 2 * 1024 * 1024, hint: 'PNG, JPG or WebP · up to 2 MB · square works best' },
  favicon: {
    accept: '.png,.ico,.jpg,.jpeg,.webp',
    types: /^image\/(png|x-icon|vnd\.microsoft\.icon|jpeg|webp)$/,
    maxBytes: 1024 * 1024,
    hint: 'PNG or ICO · up to 1 MB · used as the app & taskbar icon'
  }
} as const

/**
 * Logo + favicon for the business, uploaded straight from the desktop app
 * (multipart through main). The logo shows in the sidebar and on receipts;
 * the favicon becomes the window/taskbar icon (and the web app's tab icon).
 */
function BrandingAssets({
  business,
  logoData,
  canEdit,
  onChanged
}: {
  business: BusinessDetail
  logoData: string | null
  canEdit: boolean
  onChanged: (b: BusinessDetail) => void
}): React.JSX.Element {
  const favicon = useRemoteImage(business.favicon_url)
  return (
    <div>
      <p className="text-sm font-semibold">Branding</p>
      <p className="text-xs text-muted-foreground">Your logo and app icon appear across the whole system for everyone in your business.</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <AssetTile kind="logo" business={business} shown={logoData} hasSaved={!!business.logo_url} canEdit={canEdit} onChanged={onChanged} />
        <AssetTile kind="favicon" business={business} shown={favicon ?? (business.favicon_url ? null : logoData)} hasSaved={!!business.favicon_url} canEdit={canEdit} onChanged={onChanged} />
      </div>
    </div>
  )
}

function AssetTile({
  kind,
  business,
  shown,
  hasSaved,
  canEdit,
  onChanged
}: {
  kind: 'logo' | 'favicon'
  business: BusinessDetail
  shown: string | null
  hasSaved: boolean
  canEdit: boolean
  onChanged: (b: BusinessDetail) => void
}): React.JSX.Element {
  const rules = ASSET_RULES[kind]
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const base = { name: business.name, currency: business.currency, timezone: business.timezone }

  async function done(data: BusinessDetail, title: string): Promise<void> {
    onChanged(data)
    await refreshBusinessContext() // re-caches the logo, re-applies the window icon
    toast({ variant: 'success', title })
  }

  async function pick(file: File | undefined): Promise<void> {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    const okType = rules.types.test(file.type) || (kind === 'favicon' && /\.ico$/i.test(file.name))
    if (!okType) return setError(kind === 'logo' ? 'Please choose a PNG, JPG or WebP image.' : 'Please choose a PNG, ICO, JPG or WebP image.')
    if (file.size > rules.maxBytes) return setError(`The file must be ${rules.maxBytes / (1024 * 1024)} MB or smaller.`)
    setError(null)
    setBusy(true)
    try {
      // PHP only parses multipart bodies on POST → POST + _method=PUT.
      const res = await window.pos.remote.upload<BusinessDetail>({
        path: '/business',
        fields: { ...base, _method: 'PUT' },
        files: [{ field: kind, name: file.name, type: file.type, data: await file.arrayBuffer() }]
      })
      if (!res.ok || !res.data) throw new Error(res.errors?.[kind]?.[0] ?? res.message ?? 'Upload failed.')
      await done(res.data, kind === 'logo' ? 'Logo updated' : 'App icon updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const { data } = await remote.put<BusinessDetail>('/business', { ...base, [`remove_${kind}`]: true })
      await done(data, kind === 'logo' ? 'Logo removed' : 'App icon removed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border p-4">
      <p className="text-sm font-semibold">{kind === 'logo' ? 'Logo' : 'Favicon / app icon'}</p>
      <p className="text-xs text-muted-foreground">{kind === 'logo' ? 'Sidebar, menus and receipts.' : 'Window & taskbar icon.'}</p>
      <div className="mt-3 flex h-20 items-center justify-center rounded-lg bg-muted/60">
        {shown ? (
          <img src={shown} alt="" className={kind === 'logo' ? 'size-14 rounded-xl border border-black/5 bg-white object-contain p-1' : 'size-8 object-contain'} />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand text-sm font-bold text-brand-foreground">{initials(business.name)}</div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{rules.hint}</p>
      {kind === 'favicon' && !hasSaved && <p className="mt-1 text-xs text-muted-foreground">Not set — your logo is used instead.</p>}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      {canEdit && (
        <div className="mt-3 flex gap-2">
          <input ref={inputRef} type="file" accept={rules.accept} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
          <Button variant="outline" size="sm" loading={busy} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" /> {hasSaved ? 'Replace' : 'Upload'}
          </Button>
          {hasSaved && (
            <Button variant="ghost" size="sm" className="text-error" disabled={busy} onClick={() => void remove()}>
              <Trash2 className="size-4" /> Remove
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
