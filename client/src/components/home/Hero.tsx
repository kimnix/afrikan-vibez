import { availability, fromPrice } from '../../lib/event'
import {
  formatEventDate,
  formatEventTime,
  formatMoney,
  formatShortDate,
  timezoneLabel,
} from '../../lib/format'
import type { EventDetail } from '../../types'
import { Countdown } from '../ui/Countdown'
import { Icon } from '../ui/Icon'
import { AfrofuturistFigure } from './AfrofuturistFigure'

export function Hero({ event }: { event: EventDetail }) {
  const avail = availability(event)
  const price = fromPrice(event)
  const words = event.headline.split(' ')

  return (
    <section className="relative pt-10 pb-16 sm:pt-14 lg:pt-20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8">
        <div className="animate-float-in">
          <p className="av-eyebrow">
            <span className="av-dot" />
            {event.tagline}
          </p>

          <h1 className="av-display mt-5 text-[clamp(52px,6.6vw,88px)] text-cream">
            {words.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className={i >= words.length - 2 ? 'gold-text' : undefined}
              >
                {word}{' '}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-[1.9] text-ash">
            {event.summary}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
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

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#tickets"
              className="button-primary inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3.5 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5"
            >
              <Icon name="ticket" className="h-4 w-4" />
              Get your ticket
            </a>
            <a
              href="#experience"
              className="glass inline-flex items-center justify-center gap-2 rounded-pill px-6 py-3.5 text-sm font-semibold text-cream transition duration-200 hover:-translate-y-0.5"
            >
              Explore the experience
              <Icon name="arrowDown" className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-ash">
              {avail.soldOut ? 'Event status' : 'Event starts in'}
            </p>
            <Countdown startAt={event.startAt} endAt={event.endAt} />
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-sage">
              <span className="av-dot" />
              {avail.label}
            </p>
          </div>
        </div>

        <div className="animate-float-in">
          <AfrofuturistFigure
            chips={
              <>
                <span className="av-chip av-chip--one">
                  <span className="av-chip__dot" />
                  {formatShortDate(event.startAt, event.timezone)} · {event.venue.city}
                </span>
                <span className="av-chip av-chip--two">
                  {price !== null
                    ? `From ${formatMoney(price, event.currency)}`
                    : 'Tickets on sale'}
                </span>
              </>
            }
          />
        </div>
      </div>
    </section>
  )
}
