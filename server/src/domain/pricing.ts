import type {
  EventDetail,
  Promo,
  Quote,
  QuoteLine,
  QuoteRequest,
  TicketType,
} from './types.js'

export class PricingError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'PricingError'
    this.status = status
  }
}

const MAX_QUANTITY = 10

function findPromo(promos: Promo[], code: string): Promo | undefined {
  const normalised = code.trim().toUpperCase()
  return promos.find((p) => p.code === normalised)
}

/** Price of one selection unit of a ticket (a whole group for group tickets). */
export function unitPriceMinor(ticket: TicketType, groupSize?: number | null): number {
  if (ticket.key === 'group') {
    const size = groupSize ?? ticket.groupSizes?.[0] ?? ticket.includesPeople
    const tier = ticket.groupPricing?.find((g) => g.size === size)
    return tier ? tier.totalMinor : ticket.priceMinor * size
  }
  return ticket.priceMinor
}

/** Number of people represented by one selection unit. */
export function peoplePerUnit(ticket: TicketType, groupSize?: number | null): number {
  if (ticket.key === 'group') {
    return groupSize ?? ticket.groupSizes?.[0] ?? ticket.includesPeople
  }
  return ticket.includesPeople
}

function applyPromo(
  subtotalMinor: number,
  promo: Promo,
): { discountMinor: number; label: string } {
  let discount = 0
  if (promo.kind === 'percent') {
    discount = Math.round((subtotalMinor * promo.value) / 100)
    if (promo.maxDiscountMinor) {
      discount = Math.min(discount, promo.maxDiscountMinor)
    }
  } else {
    discount = promo.value
  }
  discount = Math.max(0, Math.min(discount, subtotalMinor))
  return { discountMinor: discount, label: promo.label }
}

/**
 * Server-authoritative quote. The browser sends what it *wants to buy*; the
 * server decides the price, discount and availability. Never trust a price
 * sent from the client.
 */
export function computeQuote(
  event: EventDetail,
  ticket: TicketType,
  req: QuoteRequest,
  promos: Promo[],
): Quote {
  if (!Number.isInteger(req.quantity) || req.quantity < 1 || req.quantity > MAX_QUANTITY) {
    throw new PricingError(400, `Quantity must be a whole number between 1 and ${MAX_QUANTITY}.`)
  }
  if (!ticket.onSale || ticket.remaining <= 0) {
    throw new PricingError(409, `${ticket.name} is not available.`)
  }

  let groupSize: number | null = null
  if (ticket.key === 'group') {
    const sizes = ticket.groupSizes ?? []
    const requested = req.groupSize ?? sizes[0]
    if (typeof requested !== 'number' || !sizes.includes(requested)) {
      throw new PricingError(400, 'Choose a valid group size.')
    }
    groupSize = requested
  }

  const perUnit = peoplePerUnit(ticket, groupSize)
  const people = perUnit * req.quantity
  const unit = unitPriceMinor(ticket, groupSize)
  const subtotalMinor = unit * req.quantity

  const lines: QuoteLine[] = [
    ticket.key === 'group'
      ? { label: `Group of ${perUnit}`, amountMinor: unit }
      : {
          label:
            ticket.key === 'exclusive'
              ? `${ticket.name} (up to ${ticket.includesPeople} people)`
              : `${ticket.name} × ${req.quantity}`,
          amountMinor: subtotalMinor,
        },
  ]
  if (ticket.key === 'group' && req.quantity > 1) {
    lines.push({ label: `× ${req.quantity} groups`, amountMinor: subtotalMinor })
  }

  let discountMinor = 0
  let promoApplied: { code: string; label: string } | null = null
  if (req.promoCode) {
    const promo = findPromo(promos, req.promoCode)
    if (!promo || !promo.active) {
      throw new PricingError(422, 'That promotional code is not valid.')
    }
    if (promo.minSubtotalMinor && subtotalMinor < promo.minSubtotalMinor) {
      throw new PricingError(
        422,
        'That promotional code does not apply to this order.',
      )
    }
    const result = applyPromo(subtotalMinor, promo)
    discountMinor = result.discountMinor
    promoApplied = { code: promo.code, label: result.label }
  }

  const discounted = subtotalMinor - discountMinor
  const feeMinor = Math.round((discounted * event.fees.bookingFeePercent) / 100)
  const totalMinor = discounted + feeMinor

  const remainingForType = Math.floor(ticket.remaining / perUnit)
  const maxQuantity = Math.min(MAX_QUANTITY, Math.max(0, remainingForType))

  return {
    eventSlug: event.slug,
    ticketTypeKey: ticket.key,
    currency: event.currency,
    quantity: req.quantity,
    groupSize,
    people,
    unitPriceMinor: ticket.priceMinor,
    lines,
    subtotalMinor,
    discountMinor,
    feeMinor,
    totalMinor,
    promo: promoApplied,
    feesNote: event.fees.note,
    available: people <= ticket.remaining,
    remaining: ticket.remaining,
    maxQuantity,
  }
}
