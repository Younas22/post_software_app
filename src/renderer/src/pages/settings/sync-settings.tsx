import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Table, THead, TBody, TR, TH, TD } from '@renderer/components/ui/table'
import { EmptyState } from '@renderer/components/ui/empty-state'
import { StatusBadge } from '@renderer/components/ui/badge'
import { toast } from '@renderer/lib/stores/toastStore'
import { formatDateTime, formatRelativeTime } from '@renderer/lib/format'
import { useSyncStore } from '@renderer/lib/stores/syncStore'
import type { ConflictRow } from '@shared/preload-api'
import type { SyncQueueItem } from '@shared/types'

export function SyncSettings(): React.JSX.Element {
  const status = useSyncStore((s) => s.status)
  const [queue, setQueue] = useState<SyncQueueItem[]>([])
  const [conflicts, setConflicts] = useState<ConflictRow[]>([])
  const [running, setRunning] = useState(false)

  async function load(): Promise<void> {
    setQueue(await window.pos.sync.getQueue())
    setConflicts(await window.pos.sync.getConflicts())
  }

  useEffect(() => {
    void load()
  }, [status])

  async function retry(): Promise<void> {
    setRunning(true)
    try {
      const count = await window.pos.sync.retryFailed()
      await window.pos.sync.runIncremental()
      toast({ variant: 'success', title: `Retrying ${count} item(s)` })
      await load()
    } finally {
      setRunning(false)
    }
  }

  async function syncNow(): Promise<void> {
    setRunning(true)
    try {
      await window.pos.sync.runIncremental()
      await load()
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Pending" value={status?.pendingCount ?? 0} />
            <Stat label="Synced" value={status?.syncedCount ?? 0} />
            <Stat label="Failed" value={status?.failedCount ?? 0} />
            <Stat label="Conflicts" value={status?.conflictCount ?? 0} />
          </div>
          <p className="text-xs text-muted-foreground">
            Last full sync: {formatRelativeTime(status?.lastFullSyncAt ?? null)} &middot; Last incremental:{' '}
            {formatRelativeTime(status?.lastIncrementalSyncAt ?? null)}
          </p>
          <div className="flex gap-2">
            <Button onClick={syncNow} loading={running}>
              <RefreshCw className="size-4" /> Sync now
            </Button>
            <Button variant="outline" onClick={retry} loading={running} disabled={(status?.failedCount ?? 0) === 0}>
              Retry failed
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync queue</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <EmptyState title="Queue is empty" description="Offline sales will appear here until they finish syncing." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Entity</TH>
                  <TH>Created</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Attempts</TH>
                  <TH>Last error</TH>
                </TR>
              </THead>
              <TBody>
                {queue.map((item) => (
                  <TR key={item.operation_id}>
                    <TD className="capitalize">{item.entity}</TD>
                    <TD>{formatDateTime(item.created_at)}</TD>
                    <TD>
                      <StatusBadge status={item.status} />
                    </TD>
                    <TD className="text-right">{item.attempts}</TD>
                    <TD className="max-w-64 truncate text-xs text-muted-foreground">{item.last_error ?? '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {conflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Entity</TH>
                  <TH>Reason</TH>
                  <TH>Detected</TH>
                </TR>
              </THead>
              <TBody>
                {conflicts.map((c) => (
                  <TR key={c.id}>
                    <TD className="capitalize">{c.entity}</TD>
                    <TD className="max-w-96 text-sm">{c.reason}</TD>
                    <TD>{formatDateTime(c.detected_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
