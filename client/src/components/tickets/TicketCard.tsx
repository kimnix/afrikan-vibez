import type { BookingTicket } from '../../types'
import { formatEventDate, formatEventTime } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Icon } from '../ui/Icon'
import { TicketQr } from './TicketQr'

interface TicketCardProps {
  ticket: BookingTicket
  reference: string
  eventName: string
  eventStartAt: string
  eventTimezone: string
  venueName?: string
  ticketTypeName: string
  index?: number
  total?: number
}

/** A single digital ticket with its scannable QR code. */
export function TicketCard({
  ticket,
  reference,
  eventName,
  eventStartAt,
  eventTimezone,
  venueName,
  ticketTypeName,
  index,
  total,
}: TicketCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
        <TicketQr value={ticket.ticketCode} size={168} className="mx-auto sm:mx-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">{ticketTypeName}</Badge>
            {typeof index === 'number' && typeof total === 'number' && (
              <Badge tone="neutral">
                Ticket {index + 1} of {total}
              </Badge>
            )}
          </div>
          <h3 className="mt-3 truncate font-display text-xl font-bold text-cream">
            {eventName}
          </h3>
          {eventStartAt && (
            <p className="mt-1 flex items-center gap-2 text-sm text-subtle">
              <Icon name="calendar" className="h-4 w-4 text-gold" />
              {formatEventDate(eventStartAt, eventTimezone)} ·{' '}
              {formatEventTime(eventStartAt, eventTimezone)}
            </p>
          )}
          {venueName && (
            <p className="mt-1 flex items-center gap-2 text-sm text-subtle">
              <Icon name="pin" className="h-4 w-4 text-gold" />
              {venueName}
            </p>
          )}
          <dl className="mt-4 grid gap-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ash">Attendee</dt>
              <dd className="truncate font-semibold text-cream">{ticket.fullName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ash">Reference</dt>
              <dd className="font-mono text-cream">{reference}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ash">Ticket code</dt>
              <dd className="truncate font-mono text-xs text-cream">{ticket.ticketCode}</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="border-t border-dashed border-white/10 px-5 py-3 text-xs text-ash">
        Show this QR code at the entrance. Each code admits one attendee.
      </p>
    </article>
  )
}
