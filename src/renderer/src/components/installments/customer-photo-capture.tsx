import { useEffect, useRef, useState } from 'react'
import { Camera, ImageUp, RotateCcw, Trash2, UserRound } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Modal } from '@renderer/components/ui/modal'
import { Alert } from '@renderer/components/ui/alert'

const TYPES = /^image\/(jpeg|png|webp)$/
/** Passport-style 3:4 crop — the proportion the receipt prints it at. */
const OUT_W = 480
const OUT_H = 640

function cropToBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = OUT_W
  canvas.height = OUT_H
  const target = OUT_W / OUT_H
  let sw = width
  let sh = height
  if (width / height > target) sw = height * target
  else sh = width / target
  canvas.getContext('2d')!.drawImage(source, (width - sw) / 2, (height - sh) / 2, sw, sh, 0, 0, OUT_W, OUT_H)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode photo.'))), 'image/jpeg', 0.88))
}

/**
 * Customer photograph for installment onboarding — USB/laptop webcam or an
 * existing image file. Held locally (preview) until the plan is saved.
 * Same behaviour as the web app's CustomerPhotoCapture.
 */
export function CustomerPhotoCapture({
  saved,
  value,
  onChange
}: {
  /** data: URI of the photo already on file (or null). */
  saved: string | null
  value: Blob | null
  onChange: (blob: Blob | null) => void
}): React.JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  async function pickFile(file: File | undefined): Promise<void> {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setError(null)
    if (!TYPES.test(file.type)) return setError('Please choose a JPG, PNG or WebP image.')
    if (file.size > 9 * 1024 * 1024) return setError('That image is too large (max 9 MB before cropping).')
    try {
      const bitmap = await createImageBitmap(file)
      onChange(await cropToBlob(bitmap, bitmap.width, bitmap.height))
      bitmap.close()
    } catch {
      setError("That image couldn't be read.")
    }
  }

  const shown = preview ?? saved

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
        {shown ? <img src={shown} alt="Customer" className="size-full object-cover" /> : <UserRound className="size-10 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">Customer photo</p>
        <p className="text-xs text-muted-foreground">Printed on every recovery receipt. Use the webcam, or upload a JPG, PNG or WebP.</p>
        {value && <p className="text-xs font-medium text-warning">New photo — saved when you create the plan.</p>}
        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setCameraOpen(true)}>
            <Camera className="size-4" /> Take photo
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImageUp className="size-4" /> Upload
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <Trash2 className="size-4" /> Discard
            </Button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} />
        </div>
      </div>
      {cameraOpen && (
        <WebcamModal
          onClose={() => setCameraOpen(false)}
          onCapture={(blob) => {
            onChange(blob)
            setCameraOpen(false)
          }}
        />
      )}
    </div>
  )
}

function WebcamModal({ onClose, onCapture }: { onClose: () => void; onCapture: (b: Blob) => void }): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active: MediaStream | null = null
    let cancelled = false
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('No camera access on this computer. Use Upload instead.')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        active = s
        setStream(s)
      })
      .catch((err: Error) => setError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'No webcam found. Connect a USB webcam, or use Upload.'))
    return () => {
      cancelled = true
      active?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream, shot])

  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url)
    },
    [shot]
  )

  async function capture(): Promise<void> {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const blob = await cropToBlob(v, v.videoWidth, v.videoHeight)
    setShot({ blob, url: URL.createObjectURL(blob) })
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Take customer photo"
      description="Ask the customer to face the camera; the photo is cropped to passport size."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {shot ? (
            <>
              <Button variant="outline" onClick={() => setShot(null)}>
                <RotateCcw className="size-4" /> Retake
              </Button>
              <Button onClick={() => onCapture(shot.blob)}>Use this photo</Button>
            </>
          ) : (
            <Button onClick={() => void capture()} disabled={!stream}>
              <Camera className="size-4" /> Capture
            </Button>
          )}
        </>
      }
    >
      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : (
        <div className="flex justify-center">
          <div className="relative aspect-[3/4] h-[52vh] overflow-hidden rounded-xl bg-black">
            {shot ? <img src={shot.url} alt="Captured" className="size-full object-cover" /> : <video ref={videoRef} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />}
          </div>
        </div>
      )}
    </Modal>
  )
}
