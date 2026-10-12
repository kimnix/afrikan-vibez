import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { updateBookingStatus } from '../src/db/admin.repo.js'
import {
  BookingError,
  createBooking,
  fulfillBooking,
  type CreateBookingInput,
} from '../src/db/bookings.repo.js'
import { closeDb } from '../src/db/client.js'
import { isIntegrationDbReady, remainingOf, resetDatabase, seedEvent } from './helpers/db.js'

const ready = await isIntegrationDbReady()

function input(eventId: string, overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  const quantity = overrides.quantity ?? 1
  const people = overrides.people ?? quantity
  const subtotalMinor = overrides.subtotalMinor ?? 3000 * quantity
  const discountMinor = overrides.discountMinor ?? 0
  const feeMinor = overrides.feeMinor ?? Math.round(subtotalMinor * 0.015)
  return {
    eventId,
    userId: null,
    ticketTypeKey: 'standard',
    quantity,
    groupSize: null,
    people,
    unitPriceMinor: 3000,
    subtotalMinor,
    discountMinor,
    feeMinor,
    totalMinor: subtotalMinor - discountMinor + feeMinor,
    currency: 'gbp',
    promoCode: null,
    purchaser: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: `ada-${Math.random().toString(36).slice(2)}@example.com`,
      marketingOptIn: false,
    },
    attendees: Array.from({ length: people }, (_, index) => ({
      fullName: `Attendee ${index + 1}`,
    })),
    paymentProvider: 'mock',
    ...overrides,
  }
}

describe.skipIf(!ready)('booking lifecycle (database)', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await closeDb()
  })

  it('creates a pending booking with one ticket per attendee', async () => {
    const { eventId } = await seedEvent()
    const { booking, accessToken } = await createBooking(
      input(eventId, { quantity: 2, people: 2 }),
    )

    expect(booking.status).toBe('pending')
    expect(booking.reference).toBeTruthy()
    expect(booking.tickets).toHaveLength(2)
    expect(booking.tickets.every((t) => t.ticketCode)).toBe(true)
    expect(accessToken).toBeTruthy()
    // Inventory is only taken at fulfilment.
    expect(await remainingOf(eventId, 'standard')).toBe(10)
  })

  it('fulfils a booking and decrements inventory exactly once', async () => {
    const { eventId } = await seedEvent()
    const { booking } = await createBooking(input(eventId, { quantity: 2, people: 2 }))

    const paid = await fulfillBooking(booking.reference, 'pay_123')
    expect(paid.status).toBe('paid')
    expect(paid.paidAt).not.toBeNull()
    expect(await remainingOf(eventId, 'standard')).toBe(8)

    await fulfillBooking(booking.reference, 'pay_123')
    expect(await remainingOf(eventId, 'standard')).toBe(8)
  })

  it('refuses to fulfil a booking when the ticket type has sold out', async () => {
    const { eventId } = await seedEvent({ standardRemaining: 1 })
    const first = await createBooking(input(eventId, { quantity: 1, people: 1 }))
    const second = await createBooking(input(eventId, { quantity: 1, people: 1 }))

    await fulfillBooking(first.booking.reference)
    expect(await remainingOf(eventId, 'standard')).toBe(0)

    await expect(fulfillBooking(second.booking.reference)).rejects.toBeInstanceOf(BookingError)
    await expect(fulfillBooking(second.booking.reference)).rejects.toMatchObject({ status: 409 })
  })

  it('never oversells under concurrent fulfilment', async () => {
    const { eventId } = await seedEvent({ standardRemaining: 1 })
    const first = await createBooking(input(eventId, { quantity: 1, people: 1 }))
    const second = await createBooking(input(eventId, { quantity: 1, people: 1 }))

    const results = await Promise.allSettled([
      fulfillBooking(first.booking.reference),
      fulfillBooking(second.booking.reference),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(await remainingOf(eventId, 'standard')).toBe(0)
  })

  it('replays a booking for the same idempotency key without duplicating tickets', async () => {
    const { eventId } = await seedEvent()
    const first = await createBooking(
      input(eventId, { quantity: 2, people: 2, idempotencyKey: 'idem-1' }),
    )
    const second = await createBooking(
      input(eventId, { quantity: 2, people: 2, idempotencyKey: 'idem-1' }),
    )

    expect(second.booking.reference).toBe(first.booking.reference)
    expect(second.booking.tickets).toHaveLength(2)
  })

  it('restores inventory (capped at capacity) when a paid booking is refunded', async () => {
    const { eventId } = await seedEvent()
    const { booking } = await createBooking(input(eventId, { quantity: 2, people: 2 }))
    await fulfillBooking(booking.reference)
    expect(await remainingOf(eventId, 'standard')).toBe(8)

    const refunded = await updateBookingStatus(booking.reference, 'refunded')
    expect(refunded.status).toBe('refunded')
    expect(await remainingOf(eventId, 'standard')).toBe(10)
  })
})
