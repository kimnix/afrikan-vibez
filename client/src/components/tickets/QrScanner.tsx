import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'

interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
}

function getDetectorCtor(): BarcodeDetectorCtor | null {
  const win = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  return win.BarcodeDetector ?? null
}

interface QrScannerProps {
  /** Called with a decoded value. Repeated reads of the same code are throttled. */
  onDetect: (value: string) => void
  active: boolean
}

/**
 * Camera QR scanner using the native `BarcodeDetector` API (Chromium-based
 * browsers). Falls back gracefully when the API or camera is unavailable.
 */
export function QrScanner({ onDetect, active }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const lastRef = useRef<{ value: string; at: number }>({ value: '', at: 0 })
  const onDetectRef = useRef(onDetect)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [supported] = useState(() => getDetectorCtor() !== null)

  useEffect(() => {
    onDetectRef.current = onDetect
  }, [onDetect])

  useEffect(() => {
    if (!active || !supported) return
    const Ctor = getDetectorCtor()
    if (!Ctor) return
    const detector = new Ctor({ formats: ['qr_code'] })
    let cancelled = false
    let stream: MediaStream | null = null

    async function tick() {
      const video = videoRef.current
      if (cancelled || !video) return
      try {
        const results = await detector.detect(video)
        if (results.length > 0) {
          const value = results[0]!.rawValue
          const now = Date.now()
          if (value !== lastRef.current.value || now - lastRef.current.at > 2500) {
            lastRef.current = { value, at: now }
            onDetectRef.current(value)
          }
        }
      } catch {
        // Ignore transient detection errors and keep polling.
      }
      if (!cancelled) timerRef.current = window.setTimeout(tick, 300)
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setRunning(true)
        tick()
      } catch {
        setError('Camera unavailable. Enter the ticket code manually below.')
      }
    }

    start()
    return () => {
      cancelled = true
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      stream?.getTracks().forEach((t) => t.stop())
      setRunning(false)
    }
  }, [active, supported])

  if (!supported) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-subtle">
        <Icon name="info" className="mr-2 inline h-4 w-4 text-gold" />
        Camera scanning isn't supported in this browser. Enter the ticket code
        manually below.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          muted
          playsInline
        />
        {running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-xl border-2 border-gold/80" />
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  )
}
