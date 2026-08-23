import { useEffect, useState } from 'react'
import { Monitor } from 'lucide-react'
import { AuthLayout } from './auth-layout'
import { Field } from '@renderer/components/ui/field'
import { Input } from '@renderer/components/ui/input'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import { remote } from '@renderer/lib/remote'
import { useAppStore } from '@renderer/lib/stores/appStore'
import type { DeviceStatus } from '@shared/types'

interface BranchOption {
  id: number
  name: string
}

export function DeviceSetupPage({ onRegistered }: { onRegistered: (status: DeviceStatus) => void }): React.JSX.Element {
  const pinnedBranch = useAppStore((s) => s.branch)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [selectedBranch, setSelectedBranch] = useState<number | null>(pinnedBranch?.id ?? null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingBranches, setLoadingBranches] = useState(!pinnedBranch)

  useEffect(() => {
    void window.pos.device.suggestedName().then(setName)
  }, [])

  useEffect(() => {
    if (pinnedBranch) return
    setLoadingBranches(true)
    remote
      .get<BranchOption[]>('/branches')
      .then(({ data }) => setBranches(data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load branches.'))
      .finally(() => setLoadingBranches(false))
  }, [pinnedBranch])

  async function handleSubmit(): Promise<void> {
    if (!selectedBranch) {
      setError('Please select a branch for this device.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const status = await window.pos.device.register(selectedBranch, name || 'POS Terminal')
      onRegistered(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Device registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Register this device" subtitle="Each installation must be registered before it can be used for POS.">
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <Alert variant="info">
          <span className="flex items-center gap-2">
            <Monitor className="size-4" /> This device will be tied to the selected branch.
          </span>
        </Alert>

        <Field label="Device name" hint="Helps you recognize this terminal later (e.g. Front Counter).">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Front Counter" />
        </Field>

        {pinnedBranch ? (
          <Field label="Branch">
            <Input value={pinnedBranch.name} disabled />
          </Field>
        ) : (
          <Field label="Branch" required>
            <Select
              disabled={loadingBranches}
              value={selectedBranch ?? ''}
              onChange={(e) => setSelectedBranch(Number(e.target.value))}
            >
              <option value="" disabled>
                {loadingBranches ? 'Loading branches...' : 'Select a branch'}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Button className="w-full" loading={loading} onClick={handleSubmit}>
          Register device
        </Button>
      </div>
    </AuthLayout>
  )
}
