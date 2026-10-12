import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

interface GlassCardProps {
  children: ReactNode
  className?: string
  /** Highlight border in gold (used for featured tiles). */
  featured?: boolean
  /** Render as an internal link. */
  to?: string
}

export function GlassCard({ children, className, featured, to }: GlassCardProps) {
  const classes = cn(
    'glass rounded-card',
    featured && 'border-gold/60 shadow-glow',
    to && 'block transition duration-200 hover:-translate-y-1 hover:border-gold/40',
    className,
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return <div className={classes}>{children}</div>
}
