import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'glass' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-gold-bright to-amber text-ink shadow-[0_10px_30px_-10px_rgba(231,195,106,0.7)] hover:brightness-105 active:brightness-95',
  glass:
    'bg-white/[0.06] text-cream border border-white/20 backdrop-blur hover:bg-white/[0.12]',
  ghost: 'text-cream/90 hover:bg-white/[0.06]',
  danger:
    'bg-red-500/15 text-red-200 border border-red-400/30 hover:bg-red-500/25',
}

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-5 py-3 text-sm',
  lg: 'px-6 py-3.5 text-base',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
  fullWidth?: boolean
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined; href?: undefined }

type ButtonAsLink = CommonProps & { to: string; href?: undefined }

type ButtonAsAnchor = CommonProps & { href: string; to?: undefined }

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor

export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    className,
    children,
    fullWidth,
    ...rest
  } = props

  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )

  if ('to' in props && props.to) {
    const { to } = props
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  if ('href' in props && props.href) {
    const { href } = props
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  }

  const { to: _to, href: _href, ...buttonProps } =
    rest as ButtonHTMLAttributes<HTMLButtonElement> & {
      to?: string
      href?: string
    }
  void _to
  void _href
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  )
}
