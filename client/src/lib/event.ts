import type { EventDetail } from '../types'

export interface Availability {
  label: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  soldOut: boolean
}

export function totalRemaining(event: EventDetail): number {
  return event.ticketTypes
    .filter((t) => t.onSale)
    .reduce((sum, t) => sum + t.remaining, 0)
}

export function availability(event: EventDetail): Availability {
  if (event.status === 'cancelled') {
    return { label: 'Cancelled', tone: 'danger', soldOut: true }
  }
  if (event.status === 'ended') {
    return { label: 'Event ended', tone: 'neutral', soldOut: true }
  }

  const remaining = totalRemaining(event)
  if (event.status === 'sold_out' || remaining <= 0) {
    return { label: 'Sold out', tone: 'danger', soldOut: true }
  }

  const totalCapacity = event.ticketTypes.reduce((s, t) => s + t.capacity, 0)
  const ratio = totalCapacity > 0 ? remaining / totalCapacity : 0
  if (ratio <= 0.1) {
    return { label: `Almost sold out · ${remaining} left`, tone: 'warning', soldOut: false }
  }
  return {
    label: `Tickets available · ${remaining} left`,
    tone: 'success',
    soldOut: false,
  }
}

/** Lowest on-sale price in minor units, if any. */
export function fromPrice(event: EventDetail): number | null {
  const prices = event.ticketTypes.filter((t) => t.onSale).map((t) => t.priceMinor)
  return prices.length ? Math.min(...prices) : null
}
