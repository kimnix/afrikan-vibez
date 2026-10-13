import { useEffect, useState } from 'react'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { EventHighlights } from '../components/home/EventHighlights'
import { Hero } from '../components/home/Hero'
import { Newsletter } from '../components/home/Newsletter'
import { WhyAttend } from '../components/home/WhyAttend'
import { Button } from '../components/ui/Button'
import { Section } from '../components/ui/Section'
import { SectionHeading } from '../components/ui/SectionHeading'
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
    <>
      <Hero event={event} />

      <Section id="categories">
        <SectionHeading
          eyebrow="Four worlds, one night"
          title="What's on"
        />
        <CategoryGrid categories={event.categories} />
      </Section>

      <Section id="highlights">
        <SectionHeading eyebrow="Event highlights" title="The full experience" />
        <EventHighlights highlights={event.highlights} />
      </Section>

      <Section id="why-attend">
        <WhyAttend reasons={event.whyAttend} />
      </Section>

      <Section id="newsletter">
        <Newsletter />
      </Section>
    </>
  )
}
