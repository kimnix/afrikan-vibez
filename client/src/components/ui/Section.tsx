import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Container } from './Container'

export function Section({
  id,
  children,
  className,
}: {
  id?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn('scroll-mt-24 py-14 sm:py-16', className)}>
      <Container>{children}</Container>
    </section>
  )
}
