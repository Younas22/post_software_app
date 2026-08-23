import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Alert } from '@renderer/components/ui/alert'
import type { UpdaterEvent } from '@shared/types'

export function AboutSettings(): React.JSX.Element {
  const [version, setVersion] = useState('')
  const [platform, setPlatform] = useState('')
  const [checking, setChecking] = useState(false)
  const [event, setEvent] = useState<UpdaterEvent | null>(null)

  useEffect(() => {
    void window.pos.system.getVersion().then(setVersion)
    void window.pos.system.getPlatform().then(setPlatform)
    return window.pos.updater.onEvent((e) => {
      setEvent(e)
      if (e.type === 'update-not-available' || e.type === 'update-available' || e.type === 'error') setChecking(false)
    })
  }, [])

  async function checkForUpdates(): Promise<void> {
    setChecking(true)
    setEvent(null)
    await window.pos.updater.check()
  }

  return (
    <div className="max-w-lg space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Version" value={version} />
          <Row label="Platform" value={platform} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkForUpdates} loading={checking}>
            Check for updates
          </Button>

          {event?.type === 'update-not-available' && <Alert variant="success">You're on the latest version.</Alert>}
          {event?.type === 'update-available' && (
            <Alert variant="info" title={`Update available: ${event.version}`}>
              <Button size="sm" className="mt-2" onClick={() => window.pos.updater.download()}>
                Download update
              </Button>
            </Alert>
          )}
          {event?.type === 'download-progress' && <Alert variant="info">Downloading update... {Math.round(event.percent ?? 0)}%</Alert>}
          {event?.type === 'update-downloaded' && (
            <Alert variant="success" title="Update downloaded">
              <Button size="sm" className="mt-2" onClick={() => window.pos.updater.quitAndInstall()}>
                Restart & install
              </Button>
            </Alert>
          )}
          {event?.type === 'error' && <Alert variant="error">{event.message}</Alert>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.pos.logs.openFolder()}>
            Open logs folder
          </Button>
        </CardContent>
      </Card>
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
