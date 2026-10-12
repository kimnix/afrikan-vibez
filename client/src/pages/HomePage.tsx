import { useEffect, useState } from 'react'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { EventHighlights } from '../components/home/EventHighlights'
import { Hero } from '../components/home/Hero'
import { Newsletter } from '../components/home/Newsletter'
import { WhyAttend } from '../components/home/WhyAttend'
import { Section } from '../components/ui/Section'
import { SectionHeading } from '../components/ui/SectionHeading'
import { getFeaturedEvent } from '../lib/api'
import type { EventDetail } from '../types'

export function HomePage() {
  const [event, setEvent] = useState<EventDetail | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getFeaturedEvent(controller.signal)
      .then(setEvent)
      .catch(() => undefined)
    return () => controller.abort()
  }, [])

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
