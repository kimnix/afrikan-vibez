import type { TicketType } from '../types'

/** Unit price for one selection of a ticket type (before quantity). */
export function unitPriceForGroup(ticket: TicketType, groupSize: number): number {
  if (ticket.groupSizes && ticket.groupPricing) {
    const tier = ticket.groupPricing.find((g) => g.size === groupSize)
    if (tier) return tier.totalMinor
  }
  return ticket.priceMinor * groupSize
}

export interface LineItem {
  label: string
  amountMinor: number
}

export interface PriceBreakdown {
  lines: LineItem[]
  subtotalMinor: number
  savingsMinor: number
  totalMinor: number
}

/**
 * Compute a transparent price breakdown for a selection.
 * `groupSize` applies only to group/table tickets; `quantity` is the number of
 * packages/single tickets selected.
 */
export function computeBreakdown(
  ticket: TicketType,
  quantity: number,
  groupSize?: number,
): PriceBreakdown {
  if (ticket.key === 'group') {
    const size = groupSize ?? ticket.groupSizes?.[0] ?? ticket.includesPeople
    const perGroup = unitPriceForGroup(ticket, size)
    const subtotal = perGroup * quantity
    const fullPrice = ticket.priceMinor * size * quantity
    return {
      lines: [
        { label: `Group of ${size}`, amountMinor: perGroup },
        ...(quantity > 1
          ? [{ label: `× ${quantity} groups`, amountMinor: subtotal }]
          : []),
      ],
      subtotalMinor: subtotal,
      savingsMinor: Math.max(0, fullPrice - subtotal),
      totalMinor: subtotal,
    }
  }

  const subtotal = ticket.priceMinor * quantity
  const label =
    ticket.key === 'exclusive'
      ? `${ticket.name} (up to ${ticket.includesPeople} people)`
      : `${ticket.name} × ${quantity}`
  return {
    lines: [{ label, amountMinor: subtotal }],
    subtotalMinor: subtotal,
    savingsMinor: 0,
    totalMinor: subtotal,
  }
}
