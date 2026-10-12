import type { ReactNode } from 'react'
import { Container } from './Container'

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 pt-16 pb-12">
      <div
        aria-hidden="true"
        className="kente pointer-events-none absolute inset-0 opacity-30"
      />
      <Container className="relative">
        {eyebrow && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-gold">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-extrabold text-cream sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base text-subtle sm:text-lg">
            {description}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </section>
  )
}

