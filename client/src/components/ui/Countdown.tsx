import { cn } from '../../lib/cn'
import { useCountdown } from '../../lib/useCountdown'

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[64px] flex-col items-center rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-3 backdrop-blur sm:min-w-[84px] sm:px-4 sm:py-4">
      <span className="font-display text-3xl font-extrabold tabular-nums text-cream sm:text-4xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ash">
        {label}
      </span>
    </div>
  )
}

export function Countdown({
  startAt,
  endAt,
  className,
}: {
  startAt: string
  endAt?: string
  className?: string
}) {
  const { days, hours, minutes, seconds, phase } = useCountdown(startAt, endAt)

  if (phase === 'live') {
    return (
      <div
        className={cn('flex items-center gap-3', className)}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
        </span>
        <span className="font-display text-xl font-bold text-gold-bright">
          The event is live now
        </span>
      </div>
    )
  }

  if (phase === 'ended') {
    return (
      <div className={cn('flex items-center gap-3', className)} role="status">
        <span className="h-3 w-3 rounded-full bg-white/30" />
        <span className="font-display text-xl font-bold text-subtle">
          This event has ended
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-2 sm:gap-3', className)}>
      <Unit value={days} label="Days" />
      <Unit value={hours} label="Hours" />
      <Unit value={minutes} label="Minutes" />
      <Unit value={seconds} label="Seconds" />
    </div>
  )
}
