import { useEffect, useState } from 'react'
import { AboutSection } from '../components/home/AboutSection'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { Hero } from '../components/home/Hero'
import { Newsletter } from '../components/home/Newsletter'
import { TicketPricing } from '../components/home/TicketPricing'
import { Button } from '../components/ui/Button'
import { Section } from '../components/ui/Section'
import { getFeaturedEvent } from '../lib/api'
import type { EventDetail } from '../types'

export function HomePage() {
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setFailed(false)
    getFeaturedEvent(controller.signal)
      .then(setEvent)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setFailed(true)
      })
    return () => controller.abort()
  }, [attempt])

  if (failed) {
    return (
      <div className="mx-auto flex min-h-[60svh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg text-cream/85">
          We couldn&apos;t load the event right now.
        </p>
        <p className="text-sm text-cream/60">
          Please check your connection and try again.
        </p>
        <Button variant="glass" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading event"
        />
      </div>
    )
  }

  return (
    <div className="av-landing">
      <div className="av-grain" aria-hidden="true" />
      <div className="av-blob av-blob--amber" aria-hidden="true" />
      <div className="av-blob av-blob--teal" aria-hidden="true" />

      <Hero event={event} />

      <Section id="experience">
        <div className="mb-8">
          <p className="av-eyebrow">
            <span className="av-dot" />
            Four worlds, one night
          </p>
          <h2 className="av-display mt-4 text-[clamp(32px,4vw,52px)] text-cream">
            The full experience
          </h2>
        </div>
        <CategoryGrid categories={event.categories} />
      </Section>

      <Section id="tickets">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="av-eyebrow">
              <span className="av-dot" />
              Choose your access
            </p>
            <h2 className="av-display mt-4 text-[clamp(32px,4vw,52px)] text-cream">
              Tickets &amp; pricing
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-[1.8] text-ash">
            Every ticket includes a personal QR code. Group and VIP options add
            priority entry and dedicated hosts.
          </p>
        </div>
        <TicketPricing event={event} />
      </Section>

      <Section id="about">
        <AboutSection event={event} />
      </Section>

      <Section id="newsletter">
        <Newsletter />
      </Section>
    </div>
  )
}
