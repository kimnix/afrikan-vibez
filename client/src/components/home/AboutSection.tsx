import { formatEventDate, formatEventTime } from '../../lib/format'
import type { EventDetail } from '../../types'
import { Icon } from '../ui/Icon'

export function AboutSection({ event }: { event: EventDetail }) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div>
        <p className="av-eyebrow">
          <span className="av-dot" />
          The movement
        </p>
        <h2 className="av-display mt-4 text-[clamp(34px,4vw,52px)] text-cream">
          One event. <span className="gold-text">One community.</span>
        </h2>
        <p className="mt-5 max-w-xl text-[15px] leading-[1.9] text-ash">
          {event.description}
        </p>

        <ul className="mt-8 grid gap-3.5">
          {event.whyAttend.map((reason) => (
            <li key={reason} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                <Icon name="check" className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm leading-[1.7] text-cream/90">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="glass rounded-card relative overflow-hidden p-8 sm:p-10">
        <div className="av-kente absolute inset-x-0 top-0 h-1.5 opacity-80" />
        <p className="text-[11px] font-semibold uppercase tracking-[2px] text-ash">
          The line-up
        </p>
        <ul className="mt-5 space-y-4">
          {event.performers.map((performer, i) => (
            <li key={performer} className="flex items-center gap-4">
              <span className="font-display text-sm font-bold text-gold/70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-cream/90">{performer}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
          <p className="flex items-center gap-3 text-subtle">
            <Icon name="calendar" className="h-4 w-4 text-gold" />
            {formatEventDate(event.startAt, event.timezone)} ·{' '}
            {formatEventTime(event.startAt, event.timezone)}
          </p>
          <p className="flex items-center gap-3 text-subtle">
            <Icon name="pin" className="h-4 w-4 text-gold" />
            {event.venue.name}, {event.venue.city}
          </p>
        </div>
      </div>
    </div>
  )
}
