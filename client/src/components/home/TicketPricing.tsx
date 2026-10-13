import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatMoney } from '../../lib/format'
import type { EventDetail, TicketCategoryKey } from '../../types'
import { Icon } from '../ui/Icon'
import { CheckoutDialog } from './CheckoutDialog'

function perLabel(key: TicketCategoryKey): string {
  if (key === 'group') return 'per person'
  if (key === 'exclusive') return 'per table'
  return 'per person'
}

export function TicketPricing({ event }: { event: EventDetail }) {
  const [openKey, setOpenKey] = useState<TicketCategoryKey | null>(null)

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {event.ticketTypes.map((ticket) => {
          const soldOut = ticket.remaining <= 0 || !ticket.onSale
          const popular = Boolean(ticket.featured)
          return (
            <div
              key={ticket.id}
              className={`glass av-price-card rounded-card p-7 ${
                popular ? 'av-price-card--popular' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-cream">{ticket.name}</h3>
                {popular && (
                  <span className="rounded-pill border border-gold/40 bg-gold/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1.2px] text-gold-bright">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ash">{ticket.tagline}</p>

              <p className="mt-5">
                <span className="gold-text font-display text-4xl font-bold">
                  {formatMoney(ticket.priceMinor, event.currency)}
                </span>
                <span className="ml-2 text-xs text-ash">
                  {perLabel(ticket.key)}
                </span>
              </p>

              <ul className="mt-6 space-y-2.5 text-sm">
                {ticket.benefits.slice(0, 4).map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-subtle">
                    <Icon
                      name="check"
                      className="mt-0.5 h-4 w-4 shrink-0 text-sage"
                    />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7">
                <button
                  type="button"
                  disabled={soldOut}
                  onClick={() => setOpenKey(ticket.key)}
                  className={
                    popular
                      ? 'button-primary inline-flex w-full items-center justify-center gap-2 rounded-pill px-6 py-3 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50'
                      : 'glass inline-flex w-full items-center justify-center gap-2 rounded-pill px-6 py-3 text-sm font-semibold text-cream transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50'
                  }
                >
                  {soldOut ? 'Sold out' : 'Select'}
                  {!soldOut && <Icon name="arrowRight" className="h-4 w-4" />}
                </button>
                {!soldOut && ticket.remaining <= 50 && (
                  <p className="mt-2 text-center text-[11px] font-medium text-amber">
                    Only {ticket.remaining} left
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-8 text-center text-sm text-ash">
        Looking for every option?{' '}
        <Link to="/tickets" className="font-semibold text-gold hover:text-gold-bright">
          Open the full ticket page
        </Link>
        .
      </p>

      <CheckoutDialog
        event={event}
        ticketKey={openKey}
        onClose={() => setOpenKey(null)}
      />
    </>
  )
}
