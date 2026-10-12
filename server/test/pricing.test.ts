import { describe, expect, it } from 'vitest'
import {
  computeQuote,
  PricingError,
  peoplePerUnit,
  unitPriceMinor,
} from '../src/domain/pricing.js'
import type { EventDetail, Promo, QuoteRequest, TicketType } from '../src/domain/types.js'

const event: EventDetail = {
  id: 'evt_test',
  slug: 'test-event',
  name: 'Test Event',
  tagline: 'tag',
  headline: 'head',
  summary: 'summary',
  description: 'description',
  startAt: '2027-07-18T15:00:00.000Z',
  endAt: '2027-07-19T02:00:00.000Z',
  timezone: 'Europe/London',
  currency: 'gbp',
  status: 'on_sale',
  venue: { name: 'Arena', addressLine: '1', city: 'London', country: 'UK' },
  heroImageUrl: null,
  fees: { bookingFeePercent: 1.5, note: 'Fees apply.' },
  categories: [],
  highlights: [],
  whyAttend: [],
  performers: [],
  rules: [],
  accessibility: [],
  faqs: [],
  ticketTypes: [],
}

const standard: TicketType = {
  id: 'tt_standard',
  key: 'standard',
  name: 'Standard Ticket',
  tagline: 'General admission',
  priceMinor: 3000,
  includesPeople: 1,
  benefits: [],
  capacity: 10,
  remaining: 10,
  onSale: true,
}

const group: TicketType = {
  id: 'tt_group',
  key: 'group',
  name: 'Group Ticket',
  tagline: 'Bring the crew',
  priceMinor: 2500,
  includesPeople: 4,
  benefits: [],
  groupSizes: [4, 6],
  groupPricing: [
    { size: 4, totalMinor: 9600 },
    { size: 6, totalMinor: 14000 },
  ],
  capacity: 8,
  remaining: 8,
  onSale: true,
}

function request(overrides: Partial<QuoteRequest> = {}): QuoteRequest {
  return { eventSlug: event.slug, ticketTypeKey: 'standard', quantity: 1, ...overrides }
}

function caught(fn: () => unknown): PricingError {
  try {
    fn()
  } catch (err) {
    if (err instanceof PricingError) return err
    throw err
  }
  throw new Error('Expected computeQuote to throw a PricingError.')
}

const noPromos: Promo[] = []

describe('unitPriceMinor / peoplePerUnit', () => {
  it('prices a group by its configured group tier', () => {
    expect(unitPriceMinor(group, 6)).toBe(14000)
    expect(peoplePerUnit(group, 6)).toBe(6)
  })

  it('falls back to per-person pricing for groups without a tier', () => {
    expect(unitPriceMinor(group, 8)).toBe(2500 * 8)
  })
})

describe('computeQuote', () => {
  it('prices a standard order and applies the booking fee', () => {
    const quote = computeQuote(event, standard, request({ quantity: 2 }), noPromos)
    expect(quote.subtotalMinor).toBe(6000)
    expect(quote.discountMinor).toBe(0)
    expect(quote.feeMinor).toBe(90)
    expect(quote.totalMinor).toBe(6090)
    expect(quote.people).toBe(2)
    expect(quote.available).toBe(true)
    expect(quote.maxQuantity).toBe(10)
  })

  it('prices a group by the selected size', () => {
    const quote = computeQuote(
      event,
      group,
      request({ ticketTypeKey: 'group', groupSize: 6, quantity: 1 }),
      noPromos,
    )
    expect(quote.unitPriceMinor).toBe(2500)
    expect(quote.people).toBe(6)
    expect(quote.subtotalMinor).toBe(14000)
    expect(quote.totalMinor).toBe(14210)
    expect(quote.maxQuantity).toBe(1)
    expect(quote.lines[0]).toMatchObject({ label: 'Group of 6', amountMinor: 14000 })
  })
})

describe('computeQuote validation', () => {
  it('rejects non-positive or fractional quantities', () => {
    expect(caught(() => computeQuote(event, standard, request({ quantity: 0 }), noPromos)).status).toBe(400)
    expect(caught(() => computeQuote(event, standard, request({ quantity: 1.5 }), noPromos)).status).toBe(400)
  })

  it('rejects quantities above the maximum', () => {
    expect(caught(() => computeQuote(event, standard, request({ quantity: 11 }), noPromos)).status).toBe(400)
  })

  it('rejects an unavailable ticket type', () => {
    const soldOut = { ...standard, remaining: 0 }
    expect(caught(() => computeQuote(event, soldOut, request(), noPromos)).status).toBe(409)
  })

  it('rejects an invalid group size', () => {
    const err = caught(() =>
      computeQuote(event, group, request({ ticketTypeKey: 'group', groupSize: 5 }), noPromos),
    )
    expect(err.status).toBe(400)
  })
})

describe('computeQuote promotions', () => {
  const promos: Promo[] = [
    { code: 'VIBES10', kind: 'percent', value: 10, label: '10% off', active: true },
    { code: 'MINUS500', kind: 'amount', value: 500, label: '£5 off', active: true },
    {
      code: 'CAP2',
      kind: 'percent',
      value: 50,
      label: '50% off (capped)',
      active: true,
      maxDiscountMinor: 1000,
    },
    {
      code: 'BIGSPEND',
      kind: 'percent',
      value: 10,
      label: 'Spend more',
      active: true,
      minSubtotalMinor: 10000,
    },
    { code: 'OLD', kind: 'percent', value: 10, label: 'Expired', active: false },
  ]

  it('applies a percentage discount and fees the discounted total', () => {
    const quote = computeQuote(
      event,
      standard,
      request({ quantity: 2, promoCode: 'vibes10' }),
      promos,
    )
    expect(quote.discountMinor).toBe(600)
    expect(quote.feeMinor).toBe(81)
    expect(quote.totalMinor).toBe(5481)
    expect(quote.promo).toMatchObject({ code: 'VIBES10' })
  })

  it('applies a fixed-amount discount', () => {
    const quote = computeQuote(
      event,
      standard,
      request({ quantity: 2, promoCode: 'MINUS500' }),
      promos,
    )
    expect(quote.discountMinor).toBe(500)
    expect(quote.totalMinor).toBe(5583)
  })

  it('caps a percentage discount at maxDiscountMinor', () => {
    const quote = computeQuote(
      event,
      standard,
      request({ quantity: 2, promoCode: 'CAP2' }),
      promos,
    )
    expect(quote.discountMinor).toBe(1000)
  })

  it('rejects unknown, inactive and minimum-spend codes', () => {
    expect(caught(() => computeQuote(event, standard, request({ promoCode: 'NOPE' }), promos)).status).toBe(422)
    expect(caught(() => computeQuote(event, standard, request({ promoCode: 'OLD' }), promos)).status).toBe(422)
    expect(caught(() => computeQuote(event, standard, request({ promoCode: 'BIGSPEND' }), promos)).status).toBe(422)
  })
})

describe('computeQuote availability', () => {
  it('reports availability against the remaining people for the group size', () => {
    const scarce: TicketType = { ...group, remaining: 5 }
    const oneGroup = computeQuote(
      event,
      scarce,
      request({ ticketTypeKey: 'group', groupSize: 4, quantity: 1 }),
      noPromos,
    )
    expect(oneGroup.available).toBe(true)
    expect(oneGroup.maxQuantity).toBe(1)

    const twoGroups = computeQuote(
      event,
      scarce,
      request({ ticketTypeKey: 'group', groupSize: 4, quantity: 2 }),
      noPromos,
    )
    expect(twoGroups.people).toBe(8)
    expect(twoGroups.available).toBe(false)
    expect(twoGroups.maxQuantity).toBe(1)
  })
})
