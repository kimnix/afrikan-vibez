import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { Countdown } from '../components/ui/Countdown'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon, type IconName } from '../components/ui/Icon'
import { Section } from '../components/ui/Section'
import { SectionHeading } from '../components/ui/SectionHeading'
import { getEventBySlug } from '../lib/api'
import { availability, fromPrice } from '../lib/event'
import {
  formatEventDate,
  formatEventTime,
  formatMoney,
  timezoneLabel,
} from '../lib/format'
import type { EventDetail } from '../types'

export function EventDetailPage() {
  const { slug = '' } = useParams()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setEvent(null)
    setNotFound(false)
    getEventBySlug(slug, controller.signal)
      .then((e) => {
        if (e) setEvent(e)
        else setNotFound(true)
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [slug])

  if (notFound) {
    return (
      <Container className="py-24 text-center">
        <h1 className="text-3xl font-bold text-cream">Event not found</h1>
        <p className="mt-3 text-subtle">
          The event you are looking for does not exist or has been removed.
        </p>
        <Button to="/events" className="mt-6">
          Browse events
        </Button>
      </Container>
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

  const avail = availability(event)
  const price = fromPrice(event)

  return (
    <>
      <section className="relative overflow-hidden pt-14 pb-12">
        <div aria-hidden="true" className="kente absolute inset-0 opacity-30" />
        <Container className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge tone={avail.tone === 'neutral' ? 'neutral' : avail.tone}>
              {avail.label}
            </Badge>
            <h1 className="mt-5 font-display text-4xl font-extrabold uppercase text-cream sm:text-5xl">
              {event.name}
            </h1>
            <p className="mt-3 text-lg text-gold">{event.tagline}</p>
            <p className="mt-5 max-w-2xl text-subtle">{event.description}</p>

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Icon name="calendar" className="mt-0.5 h-5 w-5 text-gold" />
                <div>
                  <dt className="text-xs uppercase tracking-widest text-ash">
                    Date
                  </dt>
                  <dd className="text-cream">
                    {formatEventDate(event.startAt, event.timezone)}
                  </dd>
                  <dd className="text-sm text-ash">
                    {formatEventTime(event.startAt, event.timezone)} –{' '}
                    {formatEventTime(event.endAt, event.timezone)}{' '}
                    {timezoneLabel(event.startAt, event.timezone)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="pin" className="mt-0.5 h-5 w-5 text-gold" />
                <div>
                  <dt className="text-xs uppercase tracking-widest text-ash">
                    Venue
                  </dt>
                  <dd className="text-cream">{event.venue.name}</dd>
                  <dd className="text-sm text-ash">
                    {event.venue.addressLine}, {event.venue.city}
                  </dd>
                  {event.venue.mapUrl && (
                    <a
                      href={event.venue.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
                    >
                      Open in maps
                      <Icon name="external" className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </dl>
          </div>

          <div className="glass-strong rounded-card h-fit p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ash">
              {avail.soldOut ? 'Event status' : 'Event starts in'}
            </p>
            <div className="mt-4">
              <Countdown startAt={event.startAt} endAt={event.endAt} />
            </div>
            {price !== null && (
              <p className="mt-6">
                <span className="text-xs uppercase tracking-widest text-ash">
                  Tickets from
                </span>
                <span className="gold-text font-display text-3xl font-extrabold">
                  {formatMoney(price, event.currency)}
                </span>
              </p>
            )}
            <Button to={`/tickets?event=${event.slug}`} size="lg" fullWidth className="mt-5">
              Get Your Ticket
            </Button>
          </div>
        </Container>
      </section>

      <Section id="highlights">
        <SectionHeading eyebrow="Event highlights" title="What to expect" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {event.highlights.map((h) => (
            <GlassCard key={h.title} className="p-6">
              <Icon name={h.icon as IconName} className="h-7 w-7 text-gold" />
              <h3 className="mt-4 font-bold text-cream">{h.title}</h3>
              <p className="mt-2 text-sm text-subtle">{h.description}</p>
            </GlassCard>
          ))}
        </div>
      </Section>

      <Section id="tickets">
        <SectionHeading eyebrow="Choose your experience" title="Ticket types" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {event.ticketTypes.map((t) => (
            <GlassCard
              key={t.id}
              featured={t.featured}
              className="flex flex-col p-6"
            >
              <h3 className="text-xl font-bold text-cream">{t.name}</h3>
              <p className="text-sm text-ash">{t.tagline}</p>
              <p className="gold-text font-display mt-4 text-3xl font-extrabold">
                {formatMoney(t.priceMinor, event.currency)}
                <span className="ml-1 text-sm font-medium text-ash">
                  {t.key === 'group' || t.key === 'exclusive'
                    ? t.key === 'group'
                      ? '/ person'
                      : '/ table'
                    : '/ person'}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-subtle">
                {t.benefits.slice(0, 4).map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Icon
                      name="check"
                      className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                    />
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                to={`/tickets?event=${event.slug}&type=${t.key}`}
                variant={t.featured ? 'primary' : 'glass'}
                className="mt-5"
                fullWidth
              >
                Choose {t.name}
              </Button>
            </GlassCard>
          ))}
        </div>
      </Section>

      <Section id="lineup">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Line-up" title="Performers" />
            <ul className="space-y-3">
              {event.performers.map((p) => (
                <li key={p} className="flex items-center gap-3 text-cream/90">
                  <Icon name="music" className="h-4 w-4 text-gold" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading eyebrow="Good to know" title="Event rules" />
            <ul className="space-y-3">
              {event.rules.map((r) => (
                <li key={r} className="flex items-start gap-3 text-subtle">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="accessibility">
        <SectionHeading eyebrow="Everyone welcome" title="Accessibility" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {event.accessibility.map((a) => (
            <li
              key={a}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-subtle"
            >
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {a}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="faqs">
        <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
        <div className="mx-auto max-w-3xl divide-y divide-white/10 overflow-hidden rounded-card border border-white/10">
          {event.faqs.map((faq) => (
            <details key={faq.question} className="group bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-cream marker:content-none">
                {faq.question}
                <Icon
                  name="chevronDown"
                  className="h-5 w-5 shrink-0 text-gold transition group-open:rotate-180"
                />
              </summary>
              <p className="px-5 pb-5 text-subtle">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section>
        <div className="glass-strong rounded-card flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="text-2xl font-bold text-cream">
            Ready to join the vibes?
          </h2>
          <p className="max-w-xl text-subtle">
            Pick your ticket and secure your place. Group bookings give every
            attendee their own QR ticket.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button to={`/tickets?event=${event.slug}`} size="lg">
              Get Your Ticket
            </Button>
            <Button
              to={`/tickets?event=${event.slug}&type=group`}
              variant="glass"
              size="lg"
            >
              Bring a Group
            </Button>
          </div>
          <Link
            to="/events"
            className="text-sm font-semibold text-gold hover:underline"
          >
            Back to all events
          </Link>
        </div>
      </Section>
    </>
  )
}
