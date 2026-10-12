import { availability, fromPrice } from '../../lib/event'
import { formatEventDate, formatEventTime, formatMoney } from '../../lib/format'
import type { EventDetail } from '../../types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { GlassCard } from '../ui/GlassCard'
import { Icon } from '../ui/Icon'

export function EventCard({ event }: { event: EventDetail }) {
  const avail = availability(event)
  const price = fromPrice(event)

  return (
    <GlassCard className="overflow-hidden">
      <div className="photo relative h-44">
        <div aria-hidden="true" className="kente absolute inset-0 opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
        <div className="absolute left-5 top-5">
          <Badge tone={avail.tone === 'neutral' ? 'neutral' : avail.tone}>
            {avail.label}
          </Badge>
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <p className="font-display text-2xl font-extrabold uppercase text-cream">
            {event.name}
          </p>
          <p className="text-sm text-subtle">{event.tagline}</p>
        </div>
      </div>

      <div className="p-6">
        <dl className="space-y-2 text-sm">
          <div className="flex items-center gap-2.5 text-subtle">
            <Icon name="calendar" className="h-4 w-4 text-gold" />
            <span>
              {formatEventDate(event.startAt, event.timezone)} ·{' '}
              {formatEventTime(event.startAt, event.timezone)}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-subtle">
            <Icon name="pin" className="h-4 w-4 text-gold" />
            <span>
              {event.venue.name}, {event.venue.city}
            </span>
          </div>
        </dl>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            {price !== null && (
              <>
                <span className="block text-[10px] uppercase tracking-widest text-ash">
                  From
                </span>
                <span className="gold-text font-display text-xl font-extrabold">
                  {formatMoney(price, event.currency)}
                </span>
              </>
            )}
          </div>
          <Button to={`/events/${event.slug}`} size="sm">
            View event
            <Icon name="arrowRight" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
