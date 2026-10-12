import { and, eq, isNull } from 'drizzle-orm'
import type {
  BookingStatus,
  TicketCategoryKey,
  TicketScan,
  TicketScanResult,
} from '../domain/types.js'
import { db } from './client.js'
import { bookingAttendees, bookings, events, ticketTypes } from './schema.js'

function requireDb() {
  if (!db) throw new Error('Database is not configured.')
  return db
}

/** Look up a single ticket (and its booking/event context) by opaque code. */
export async function findTicketScan(code: string): Promise<TicketScan | undefined> {
  const database = requireDb()
  const [row] = await database
    .select({
      ticketId: bookingAttendees.id,
      ticketCode: bookingAttendees.ticketCode,
      attendeeName: bookingAttendees.fullName,
      attendeeEmail: bookingAttendees.email,
      checkedInAt: bookingAttendees.checkedInAt,
      bookingReference: bookings.reference,
      bookingStatus: bookings.status,
      ticketTypeKey: bookings.ticketTypeKey,
      ticketTypeName: ticketTypes.name,
      eventName: events.name,
      eventSlug: events.slug,
      eventStartAt: events.startAt,
      eventTimezone: events.timezone,
      venue: events.venue,
    })
    .from(bookingAttendees)
    .innerJoin(bookings, eq(bookingAttendees.bookingId, bookings.id))
    .leftJoin(events, eq(bookings.eventId, events.id))
    .leftJoin(
      ticketTypes,
      and(
        eq(ticketTypes.eventId, bookings.eventId),
        eq(ticketTypes.key, bookings.ticketTypeKey),
      ),
    )
    .where(eq(bookingAttendees.ticketCode, code))
    .limit(1)

  if (!row) return undefined
  return {
    ticketId: row.ticketId,
    ticketCode: row.ticketCode,
    attendeeName: row.attendeeName,
    attendeeEmail: row.attendeeEmail,
    checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
    bookingReference: row.bookingReference,
    bookingStatus: row.bookingStatus as BookingStatus,
    ticketTypeKey: row.ticketTypeKey as TicketCategoryKey,
    ticketTypeName: row.ticketTypeName ?? row.ticketTypeKey,
    eventName: row.eventName ?? '',
    eventSlug: row.eventSlug ?? '',
    eventStartAt: row.eventStartAt ? row.eventStartAt.toISOString() : '',
    eventTimezone: row.eventTimezone ?? 'UTC',
    venueName: row.venue?.name ?? '',
  }
}

/** Validate a code without changing any state. */
export async function validateTicket(code: string): Promise<TicketScanResult> {
  const scan = await findTicketScan(code)
  if (!scan) return { status: 'not_found', scan: null }
  if (scan.bookingStatus !== 'paid') return { status: 'not_paid', scan }
  if (scan.checkedInAt) return { status: 'already_checked_in', scan }
  return { status: 'valid', scan }
}

/**
 * Mark a ticket as checked in. The conditional `isNull` update makes concurrent
 * scans safe: only the first one flips the timestamp and reports `valid`; any
 * later scan reports `already_checked_in`.
 */
export async function checkInTicket(code: string): Promise<TicketScanResult> {
  const database = requireDb()
  const existing = await findTicketScan(code)
  if (!existing) return { status: 'not_found', scan: null }
  if (existing.bookingStatus !== 'paid') return { status: 'not_paid', scan: existing }

  const updated = await database
    .update(bookingAttendees)
    .set({ checkedInAt: new Date() })
    .where(
      and(
        eq(bookingAttendees.ticketCode, code),
        isNull(bookingAttendees.checkedInAt),
      ),
    )
    .returning({ id: bookingAttendees.id })

  const scan = await findTicketScan(code)
  if (!scan) return { status: 'not_found', scan: null }
  return {
    status: updated.length > 0 ? 'valid' : 'already_checked_in',
    scan,
  }
}
