import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('group flex items-center gap-3', className)}
      aria-label="African Vibes home"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-gold/45 bg-white/[0.06] font-display text-sm font-bold tracking-[0.08em] text-gold-bright shadow-[0_8px_24px_-12px_rgba(241,198,107,0.8)] backdrop-blur">
        AV
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-base font-bold tracking-[0.14em] text-cream">
          AFRICAN <span className="gold-text">VIBES</span>
        </span>
        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-ash">
          Culture · Football · Music
        </span>
      </span>
    </Link>
  )
}
