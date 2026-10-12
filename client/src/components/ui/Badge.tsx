import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Tone = 'gold' | 'neutral' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  gold: 'border-gold/40 bg-gold/10 text-gold-bright',
  neutral: 'border-white/20 bg-white/[0.06] text-subtle',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  danger: 'border-red-400/30 bg-red-400/10 text-red-200',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-3 py-1 text-xs font-semibold tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
