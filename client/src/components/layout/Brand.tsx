import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('group flex items-center gap-3', className)}
      aria-label="African Vibes home"
    >
      <img src="/favicon.svg" alt="" className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-extrabold tracking-[0.14em] text-cream">
          AFRICAN <span className="gold-text">VIBES</span>
        </span>
        <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-ash">
          Culture · Football · Music
        </span>
      </span>
    </Link>
  )
}
