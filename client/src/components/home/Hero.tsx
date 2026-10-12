import { availability, fromPrice } from '../../lib/event'
import {
  formatEventDate,
  formatEventTime,
  formatMoney,
  timezoneLabel,
} from '../../lib/format'
import type { EventDetail } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { Countdown } from '../ui/Countdown'
import { Icon } from '../ui/Icon'

export function Hero({ event }: { event: EventDetail }) {
  const avail = availability(event)
  const price = fromPrice(event)
  const words = event.headline.split(' ')

  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 lg:pt-24">
      <div
        aria-hidden="true"
        className="kente pointer-events-none absolute inset-0 opacity-40"
      />
      <Container className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-float-in">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-gold">
            {event.tagline}
          </p>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.98] text-cream sm:text-5xl lg:text-6xl">
            {words.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className={i >= words.length - 2 ? 'gold-text' : undefined}
              >
                {word}{' '}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-xl text-base text-subtle sm:text-lg">
            {event.summary}
          </p>

          <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Icon name="calendar" className="mt-0.5 h-5 w-5 text-gold" />
              <div>
                <dt className="sr-only">Date</dt>
                <dd className="font-medium text-cream">
                  {formatEventDate(event.startAt, event.timezone)}
                </dd>
                <dd className="text-ash">
                  {formatEventTime(event.startAt, event.timezone)}{' '}
                  {timezoneLabel(event.startAt, event.timezone)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Icon name="pin" className="mt-0.5 h-5 w-5 text-gold" />
              <div>
                <dt className="sr-only">Venue</dt>
                <dd className="font-medium text-cream">{event.venue.name}</dd>
                <dd className="text-ash">
                  {event.venue.city}, {event.venue.country}
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-6">
            <Badge tone={avail.tone === 'neutral' ? 'neutral' : avail.tone}>
              {avail.label}
            </Badge>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/tickets" size="lg">
              <Icon name="ticket" className="h-5 w-5" />
              Get Your Ticket
            </Button>
            <Button to="/tickets?type=group" variant="glass" size="lg">
              <Icon name="users" className="h-5 w-5" />
              Bring a Group
            </Button>
          </div>

          <div className="mt-10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-ash">
              {avail.soldOut ? 'Event status' : 'Event starts in'}
            </p>
            <Countdown startAt={event.startAt} endAt={event.endAt} />
          </div>
        </div>

        <div className="animate-float-in">
          <div className="glass-strong rounded-card overflow-hidden">
            <div className="photo relative aspect-[4/5] sm:aspect-[5/6]">
              <div
                aria-hidden="true"
                className="kente absolute inset-0 opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                <Badge tone="gold" className="self-start">
                  <Icon name="sparkle" className="h-3.5 w-3.5" />
                  Featured Event
                </Badge>
                <div>
                  <p className="font-display text-3xl font-extrabold uppercase leading-none text-cream">
                    {event.name}
                  </p>
                  <p className="mt-2 text-sm text-subtle">{event.tagline}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <span className="text-sm text-ash">
                      {formatEventDate(event.startAt, event.timezone).replace(
                        /^\w+ /,
                        '',
                      )}
                    </span>
                    {price !== null && (
                      <span className="text-right">
                        <span className="block text-[10px] uppercase tracking-widest text-ash">
                          From
                        </span>
                        <span className="gold-text font-display text-2xl font-extrabold">
                          {formatMoney(price, event.currency)}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
