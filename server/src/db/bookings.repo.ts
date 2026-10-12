import { and, asc, desc, eq } from 'drizzle-orm'
import type {
  Attendee,
  BookingDetail,
  BookingStatus,
  BookingSummary,
  PaymentProviderName,
  Purchaser,
  TicketCategoryKey,
} from '../domain/types.js'
import {
  generateAccessToken,
  generateReference,
  generateTicketCode,
  sha256,
} from '../domain/reference.js'
import { db } from './client.js'
import {
  bookingAttendees,
  bookings,
  events,
  ticketTypes,
  type BookingAttendeeRow,
  type BookingRow,
} from './schema.js'

export class BookingError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'BookingError'
    this.status = status
  }
}

function requireDb() {
  if (!db) {
    throw new BookingError(503, 'Bookings are unavailable right now.')
  }
  return db
}

export interface CreateBookingInput {
  eventId: string
  userId: string | null
  ticketTypeKey: TicketCategoryKey
  quantity: number
  groupSize: number | null
  people: number
  unitPriceMinor: number
  subtotalMinor: number
  discountMinor: number
  feeMinor: number
  totalMinor: number
  currency: string
  promoCode: string | null
  purchaser: Purchaser
  attendees: Attendee[]
  paymentProvider: PaymentProviderName
  idempotencyKey?: string | null
}

function toBookingDetail(
  row: BookingRow,
  event: { name: string; slug: string; startAt: string; timezone: string; venueName: string },
  ticketTypeName: string,
  attendees: BookingAttendeeRow[],
): BookingDetail {
  return {
    reference: row.reference,
    status: row.status as BookingStatus,
    eventSlug: event.slug,
    eventName: event.name,
    eventStartAt: event.startAt,
    eventTimezone: event.timezone,
    venueName: event.venueName,
    ticketTypeKey: row.ticketTypeKey as TicketCategoryKey,
    ticketTypeName,
    quantity: row.quantity,
    groupSize: row.groupSize,
    people: row.people,
    currency: row.currency,
    unitPriceMinor: row.unitPriceMinor,
    subtotalMinor: row.subtotalMinor,
    discountMinor: row.discountMinor,
    feeMinor: row.feeMinor,
    totalMinor: row.totalMinor,
    promoCode: row.promoCode,
    purchaser: row.purchaser,
    tickets: attendees.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      email: a.email ?? undefined,
      ticketCode: a.ticketCode,
      checkedInAt: a.checkedInAt ? a.checkedInAt.toISOString() : null,
    })),
    paymentProvider: row.paymentProvider as PaymentProviderName,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

async function loadDetail(
  where: ReturnType<typeof eq>,
): Promise<BookingDetail | undefined> {
  const database = requireDb()
  const [row] = await database.select().from(bookings).where(where).limit(1)
  if (!row) return undefined

  const [event] = await database
    .select({
      name: events.name,
      slug: events.slug,
      startAt: events.startAt,
      timezone: events.timezone,
      venue: events.venue,
    })
    .from(events)
    .where(eq(events.id, row.eventId))
    .limit(1)

  const [ticket] = await database
    .select({ name: ticketTypes.name })
    .from(ticketTypes)
    .where(
      and(
        eq(ticketTypes.eventId, row.eventId),
        eq(ticketTypes.key, row.ticketTypeKey),
      ),
    )
    .limit(1)

  const attendees = await database
    .select()
    .from(bookingAttendees)
    .where(eq(bookingAttendees.bookingId, row.id))
    .orderBy(asc(bookingAttendees.createdAt))

  return toBookingDetail(
    row,
    {
      name: event?.name ?? '',
      slug: event?.slug ?? '',
      startAt: event?.startAt ? event.startAt.toISOString() : '',
      timezone: event?.timezone ?? 'UTC',
      venueName: event?.venue?.name ?? '',
    },
    ticket?.name ?? row.ticketTypeKey,
    attendees,
  )
}

export function getBookingDetail(reference: string): Promise<BookingDetail | undefined> {
  return loadDetail(eq(bookings.reference, reference))
}

export function getBookingDetailById(id: string): Promise<BookingDetail | undefined> {
  return loadDetail(eq(bookings.id, id))
}

export async function findBookingRow(reference: string): Promise<BookingRow | undefined> {
  const database = requireDb()
  const [row] = await database
    .select()
    .from(bookings)
    .where(eq(bookings.reference, reference))
    .limit(1)
  return row
}

async function findBookingByIdempotencyKey(
  key: string,
): Promise<BookingRow | undefined> {
  const database = requireDb()
  const [row] = await database
    .select()
    .from(bookings)
    .where(eq(bookings.idempotencyKey, key))
    .limit(1)
  return row
}

/** Whether the opaque token matches the stored hash for this booking. */
export function verifyBookingAccess(row: BookingRow, token: string | undefined): boolean {
  if (!token) return false
  return row.accessTokenHash === sha256(token)
}

export async function createBooking(
  input: CreateBookingInput,
): Promise<{ booking: BookingDetail; accessToken: string }> {
  const database = requireDb()

  // Idempotent replay: return the existing booking with a fresh access token.
  if (input.idempotencyKey) {
    const existing = await findBookingByIdempotencyKey(input.idempotencyKey)
    if (existing) {
      const token = generateAccessToken()
      await database
        .update(bookings)
        .set({ accessTokenHash: token.hash, updatedAt: new Date() })
        .where(eq(bookings.id, existing.id))
      const detail = await getBookingDetailById(existing.id)
      return { booking: detail!, accessToken: token.raw }
    }
  }

  const token = generateAccessToken()
  let reference = generateReference()
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await database
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.reference, reference))
      .limit(1)
    if (clash.length === 0) break
    reference = generateReference()
  }

  const bookingId = await database.transaction(async (tx) => {
    const [row] = await tx
      .insert(bookings)
      .values({
        reference,
        accessTokenHash: token.hash,
        eventId: input.eventId,
        userId: input.userId,
        ticketTypeKey: input.ticketTypeKey,
        quantity: input.quantity,
        groupSize: input.groupSize,
        people: input.people,
        unitPriceMinor: input.unitPriceMinor,
        subtotalMinor: input.subtotalMinor,
        discountMinor: input.discountMinor,
        feeMinor: input.feeMinor,
        totalMinor: input.totalMinor,
        currency: input.currency,
        promoCode: input.promoCode,
        status: 'pending',
        paymentProvider: input.paymentProvider,
        idempotencyKey: input.idempotencyKey ?? null,
        purchaser: input.purchaser,
      })
      .returning()

    await tx.insert(bookingAttendees).values(
      input.attendees.map((a) => ({
        bookingId: row!.id,
        fullName: a.fullName,
        email: a.email ?? null,
        ticketCode: generateTicketCode(),
      })),
    )
    return row!.id
  })

  const detail = await getBookingDetailById(bookingId)
  return { booking: detail!, accessToken: token.raw }
}

/**
 * Mark a booking paid and decrement inventory atomically. Idempotent: a booking
 * that is already paid is returned unchanged.
 */
export async function fulfillBooking(
  reference: string,
  paymentRef: string | null = null,
): Promise<BookingDetail> {
  const database = requireDb()

  await database.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.reference, reference))
      .limit(1)
      .for('update')
    if (!row) throw new BookingError(404, 'Booking not found.')
    if (row.status === 'paid') return
    if (row.status === 'cancelled' || row.status === 'refunded') {
      throw new BookingError(409, 'This booking can no longer be paid.')
    }

    const [ticket] = await tx
      .select()
      .from(ticketTypes)
      .where(
        and(
          eq(ticketTypes.eventId, row.eventId),
          eq(ticketTypes.key, row.ticketTypeKey),
        ),
      )
      .limit(1)
      .for('update')
    if (!ticket) throw new BookingError(409, 'That ticket type is no longer available.')
    if (ticket.remaining < row.people) {
      throw new BookingError(409, 'Sorry, those tickets just sold out.')
    }

    await tx
      .update(ticketTypes)
      .set({ remaining: ticket.remaining - row.people, updatedAt: new Date() })
      .where(eq(ticketTypes.id, ticket.id))

    await tx
      .update(bookings)
      .set({
        status: 'paid',
        paidAt: new Date(),
        paymentRef: paymentRef ?? row.paymentRef,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, row.id))
  })

  const detail = await getBookingDetail(reference)
  if (!detail) throw new BookingError(404, 'Booking not found.')
  return detail
}

export async function failBooking(
  reference: string,
  paymentRef: string | null = null,
): Promise<void> {
  const database = requireDb()
  await database
    .update(bookings)
    .set({ status: 'failed', paymentRef, updatedAt: new Date() })
    .where(and(eq(bookings.reference, reference), eq(bookings.status, 'pending')))
}

export async function setBookingPaymentRef(
  reference: string,
  paymentRef: string,
): Promise<void> {
  const database = requireDb()
  await database
    .update(bookings)
    .set({ paymentRef, updatedAt: new Date() })
    .where(eq(bookings.reference, reference))
}

/** All bookings linked to a user, newest first. */
export async function listUserBookings(userId: string): Promise<BookingSummary[]> {
  const database = requireDb()
  const rows = await database
    .select({
      reference: bookings.reference,
      status: bookings.status,
      eventSlug: events.slug,
      eventName: events.name,
      eventStartAt: events.startAt,
      eventTimezone: events.timezone,
      venue: events.venue,
      ticketTypeKey: bookings.ticketTypeKey,
      ticketTypeName: ticketTypes.name,
      quantity: bookings.quantity,
      people: bookings.people,
      totalMinor: bookings.totalMinor,
      currency: bookings.currency,
      paidAt: bookings.paidAt,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .leftJoin(events, eq(bookings.eventId, events.id))
    .leftJoin(
      ticketTypes,
      and(
        eq(ticketTypes.eventId, bookings.eventId),
        eq(ticketTypes.key, bookings.ticketTypeKey),
      ),
    )
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.createdAt))

  return rows.map((row) => ({
    reference: row.reference,
    status: row.status as BookingStatus,
    eventSlug: row.eventSlug ?? '',
    eventName: row.eventName ?? '',
    eventStartAt: row.eventStartAt ? row.eventStartAt.toISOString() : '',
    eventTimezone: row.eventTimezone ?? 'UTC',
    venueName: row.venue?.name ?? '',
    ticketTypeKey: row.ticketTypeKey as TicketCategoryKey,
    ticketTypeName: row.ticketTypeName ?? row.ticketTypeKey,
    quantity: row.quantity,
    people: row.people,
    totalMinor: row.totalMinor,
    currency: row.currency,
    ticketCount: row.people,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }))
}

/**
 * Link a guest booking to an account. Refuses if it already belongs to a
 * different user. Callers must verify the booking access token first.
 */
export async function claimBooking(
  reference: string,
  userId: string,
): Promise<BookingRow> {
  const database = requireDb()
  const row = await findBookingRow(reference)
  if (!row) throw new BookingError(404, 'Booking not found.')
  if (row.userId && row.userId !== userId) {
    throw new BookingError(409, 'This booking is already linked to another account.')
  }
  if (row.userId === userId) return row

  const [updated] = await database
    .update(bookings)
    .set({ userId, updatedAt: new Date() })
    .where(eq(bookings.id, row.id))
    .returning()
  return updated ?? row
}
