import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import { LoadingState } from '@renderer/components/ui/loading-state'
import { toast } from '@renderer/lib/stores/toastStore'
import type { PrinterConfig, PrinterInfo } from '@shared/types'

export function PrinterSettings(): React.JSX.Element {
  const [config, setConfig] = useState<PrinterConfig | null>(null)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null)

  useEffect(() => {
    void Promise.all([window.pos.printer.getDefault(), window.pos.printer.list()]).then(([c, p]) => {
      setConfig(c)
      setPrinters(p)
    })
  }, [])

  async function save(): Promise<void> {
    if (!config) return
    setSaving(true)
    try {
      const saved = await window.pos.printer.setDefault(config)
      setConfig(saved)
      toast({ variant: 'success', title: 'Printer settings saved' })
    } finally {
      setSaving(false)
    }
  }

  async function testCashDrawer(): Promise<void> {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.pos.printer.openCashDrawer()
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  if (!config) return <LoadingState />

  return (
    <div className="max-w-lg space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="size-4" /> Receipt printer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Connection type">
            <Select value={config.connection} onChange={(e) => setConfig({ ...config, connection: e.target.value as PrinterConfig['connection'] })}>
              <option value="system">System printer (USB / driver)</option>
              <option value="network">Network / ESC-POS (TCP, e.g. thermal printer)</option>
            </Select>
          </Field>

          {config.connection === 'system' ? (
            <Field label="Printer" hint="Uses the OS print dialog/spooler.">
              <Select
                value={config.systemPrinterName ?? ''}
                onChange={(e) => setConfig({ ...config, systemPrinterName: e.target.value || null })}
              >
                <option value="">System default</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.displayName}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <>
              <Field label="Printer IP address" required>
                <Input value={config.networkHost ?? ''} onChange={(e) => setConfig({ ...config, networkHost: e.target.value })} placeholder="192.168.1.50" />
              </Field>
              <Field label="Port">
                <Input type="number" value={config.networkPort} onChange={(e) => setConfig({ ...config, networkPort: Number(e.target.value) })} />
              </Field>
            </>
          )}

          <Field label="Paper size">
            <Select value={config.paperSize} onChange={(e) => setConfig({ ...config, paperSize: e.target.value as PrinterConfig['paperSize'] })}>
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
              <option value="A4">A4</option>
            </Select>
          </Field>

          <label className="flex items-center gap-2">
            <Switch checked={config.openCashDrawerAfterSale} onChange={(e) => setConfig({ ...config, openCashDrawerAfterSale: e.target.checked })} />
            <span className="text-sm">Open cash drawer automatically after a cash sale</span>
          </label>

          {config.connection === 'system' && (
            <Alert variant="info">
              Cash drawer control requires a network (ESC/POS) printer profile — a local/USB printer has no
              standard cross-vendor raw-byte path.
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={save} loading={saving}>
              Save
            </Button>
            <Button variant="outline" onClick={testCashDrawer} loading={testing} disabled={config.connection !== 'network'}>
              Test cash drawer
            </Button>
          </div>

          {testResult && (
            <Alert variant={testResult.ok ? 'success' : 'error'}>{testResult.ok ? 'Cash drawer signal sent.' : testResult.message}</Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
