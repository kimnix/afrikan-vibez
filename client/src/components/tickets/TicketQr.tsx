import { useEffect, useState } from 'react'
import * as QRCode from 'qrcode'
import { cn } from '../../lib/cn'

interface TicketQrProps {
  /** Text encoded in the QR (the opaque ticket code). */
  value: string
  size?: number
  className?: string
}

/** Renders a ticket's QR code as an image. */
export function TicketQr({ value, size = 200, className }: TicketQrProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0b12', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setSrc(url)
      })
      .catch(() => {
        if (active) setSrc(null)
      })
    return () => {
      active = false
    }
  }, [value, size])

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl bg-white p-3',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          width={size}
          height={size}
          alt={`QR code for ticket ${value}`}
          className="h-auto w-full max-w-full"
        />
      ) : (
        <span
          className="block animate-pulse rounded bg-slate-200"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  )
}
