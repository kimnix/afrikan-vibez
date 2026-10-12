import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-wrap items-end justify-between gap-4',
        className,
      )}
    >
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-gold">
            {eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-bold text-cream sm:text-4xl">{title}</h2>
      </div>
      {action}
    </div>
  )
}
