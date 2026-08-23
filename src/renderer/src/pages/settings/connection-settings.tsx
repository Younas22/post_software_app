import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import { StatusBadge } from '@renderer/components/ui/badge'
import { toast } from '@renderer/lib/stores/toastStore'
import { useAppStore } from '@renderer/lib/stores/appStore'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import { formatDateTime } from '@renderer/lib/format'

export function ConnectionSettings(): React.JSX.Element {
  const [apiUrl, setApiUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [forgetOpen, setForgetOpen] = useState(false)
  const device = useAppStore((s) => s.device)
  const online = useSyncStore((s) => s.online)

  useEffect(() => {
    void window.pos.settings.get('api_base_url').then((v) => setApiUrl(v ?? 'http://localhost/post_software/api/v1'))
  }, [])

  async function save(): Promise<void> {
    setSaving(true)
    try {
      await window.pos.settings.set('api_base_url', apiUrl)
      toast({ variant: 'success', title: 'Connection settings saved', description: 'Restart the app for this to take full effect.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Server connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="API base URL" hint="Only change this if instructed by your administrator.">
            <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
          </Field>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <StatusBadge status={online} />
          </div>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This device</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {device?.device ? (
            <>
              <Row label="Name" value={device.device.name} />
              <Row label="Platform" value={device.device.platform} />
              <Row label="Status" value={<StatusBadge status={device.device.status} />} />
              <Row label="Registered" value={device.device.activated_at ? formatDateTime(device.device.activated_at) : '—'} />
              <Row label="Last seen" value={device.device.last_seen_at ? formatDateTime(device.device.last_seen_at) : '—'} />
              <Button variant="danger" onClick={() => setForgetOpen(true)}>
                Forget this device
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No device registration found.</p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={forgetOpen}
        title="Forget this device?"
        description="You will need to register this installation again before it can be used for POS."
        confirmLabel="Forget device"
        danger
        onConfirm={async () => {
          await window.pos.device.forget()
          setForgetOpen(false)
          window.location.reload()
        }}
        onCancel={() => setForgetOpen(false)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
