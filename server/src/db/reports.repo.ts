import { and, asc, count, eq, sql, sum } from 'drizzle-orm'
import { db } from './client.js'
import { BookingError } from './bookings.repo.js'
import { bookingAttendees, bookings, events, ticketTypes } from './schema.js'

function database() {
  if (!db) throw new BookingError(503, 'Database is not configured.')
  return db
}

// ---------------------------------------------------------------------------
// Sales over time
// ---------------------------------------------------------------------------

export interface SalesPoint {
  /** ISO date, e.g. 2027-07-18. */
  date: string
  revenueMinor: number
  tickets: number
  bookings: number
}

export interface SalesReport {
  days: number
  currency: string
  points: SalesPoint[]
  totals: {
    revenueMinor: number
    tickets: number
    bookings: number
    refundedMinor: number
  }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Paid revenue, tickets and order counts per day for the last `days` days.
 * Missing days are filled with zeroes so the series is continuous.
 */
export async function getSalesReport(days: number): Promise<SalesReport> {
  const dbc = database()
  const span = Math.min(Math.max(Math.floor(days) || 30, 1), 365)
  const day = sql<string>`to_char(coalesce(${bookings.paidAt}, ${bookings.createdAt}), 'YYYY-MM-DD')`
  const inRange = sql`coalesce(${bookings.paidAt}, ${bookings.createdAt}) >= now() - make_interval(days => ${span})`

  const [rows, [paidAgg], [refundAgg]] = await Promise.all([
    dbc
      .select({
        date: day,
        revenue: sum(bookings.totalMinor),
        tickets: sum(bookings.people),
        bookings: count(),
      })
      .from(bookings)
      .where(and(eq(bookings.status, 'paid'), inRange))
      .groupBy(day)
      .orderBy(day),
    dbc
      .select({
        revenue: sum(bookings.totalMinor),
        tickets: sum(bookings.people),
        bookings: count(),
        currency: sql<string>`coalesce(min(${bookings.currency}), 'gbp')`,
      })
      .from(bookings)
      .where(and(eq(bookings.status, 'paid'), inRange)),
    dbc
      .select({ revenue: sum(bookings.totalMinor) })
      .from(bookings)
      .where(and(eq(bookings.status, 'refunded'), inRange)),
  ])

  const byDate = new Map(rows.map((row) => [row.date, row]))
  const points: SalesPoint[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let offset = span - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(today)
    cursor.setUTCDate(cursor.getUTCDate() - offset)
    const key = isoDay(cursor)
    const row = byDate.get(key)
    points.push({
      date: key,
      revenueMinor: Number(row?.revenue ?? 0),
      tickets: Number(row?.tickets ?? 0),
      bookings: Number(row?.bookings ?? 0),
    })
  }

  return {
    days: span,
    currency: paidAgg?.currency ?? 'gbp',
    points,
    totals: {
      revenueMinor: Number(paidAgg?.revenue ?? 0),
      tickets: Number(paidAgg?.tickets ?? 0),
      bookings: Number(paidAgg?.bookings ?? 0),
      refundedMinor: Number(refundAgg?.revenue ?? 0),
    },
  }
}

// ---------------------------------------------------------------------------
// Per-event performance
// ---------------------------------------------------------------------------

export interface EventPerformance {
  eventId: string
  name: string
  slug: string
  status: string
  currency: string
  startAt: string
  capacity: number
  remaining: number
  bookings: number
  ticketsSold: number
  revenueMinor: number
  refundedMinor: number
  checkedIn: number
  sellThrough: number
}

export async function getEventPerformance(): Promise<EventPerformance[]> {
  const dbc = database()

  const [eventRows, capacityRows, paidRows, refundRows, checkInRows] = await Promise.all([
    dbc
      .select({
        id: events.id,
        name: events.name,
        slug: events.slug,
        status: events.status,
        currency: events.currency,
        startAt: events.startAt,
      })
      .from(events)
      .orderBy(asc(events.startAt)),
    dbc
      .select({
        eventId: ticketTypes.eventId,
        capacity: sum(ticketTypes.capacity),
        remaining: sum(ticketTypes.remaining),
      })
      .from(ticketTypes)
      .groupBy(ticketTypes.eventId),
    dbc
      .select({
        eventId: bookings.eventId,
        bookings: count(),
        tickets: sum(bookings.people),
        revenue: sum(bookings.totalMinor),
      })
      .from(bookings)
      .where(eq(bookings.status, 'paid'))
      .groupBy(bookings.eventId),
    dbc
      .select({ eventId: bookings.eventId, revenue: sum(bookings.totalMinor) })
      .from(bookings)
      .where(eq(bookings.status, 'refunded'))
      .groupBy(bookings.eventId),
    dbc
      .select({ eventId: bookings.eventId, checkedIn: count(bookingAttendees.id) })
      .from(bookings)
      .leftJoin(bookingAttendees, eq(bookingAttendees.bookingId, bookings.id))
      .where(sql`${bookingAttendees.checkedInAt} is not null`)
      .groupBy(bookings.eventId),
  ])

  const capacityByEvent = new Map(capacityRows.map((row) => [row.eventId, row]))
  const paidByEvent = new Map(paidRows.map((row) => [row.eventId, row]))
  const refundByEvent = new Map(refundRows.map((row) => [row.eventId, row]))
  const checkInByEvent = new Map(checkInRows.map((row) => [row.eventId, row]))

  return eventRows.map((event) => {
    const capacity = Number(capacityByEvent.get(event.id)?.capacity ?? 0)
    const remaining = Number(capacityByEvent.get(event.id)?.remaining ?? 0)
    const sold = capacity - remaining
    const paid = paidByEvent.get(event.id)
    return {
      eventId: event.id,
      name: event.name,
      slug: event.slug,
      status: event.status,
      currency: event.currency,
      startAt: event.startAt.toISOString(),
      capacity,
      remaining,
      bookings: Number(paid?.bookings ?? 0),
      ticketsSold: Number(paid?.tickets ?? 0),
      revenueMinor: Number(paid?.revenue ?? 0),
      refundedMinor: Number(refundByEvent.get(event.id)?.revenue ?? 0),
      checkedIn: Number(checkInByEvent.get(event.id)?.checkedIn ?? 0),
      sellThrough: capacity > 0 ? Math.round((sold / capacity) * 1000) / 10 : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Sales by ticket type
// ---------------------------------------------------------------------------

export interface TicketTypeBreakdown {
  key: string
  name: string
  bookings: number
  tickets: number
  revenueMinor: number
}

export async function getTicketTypeBreakdown(): Promise<TicketTypeBreakdown[]> {
  const dbc = database()

  const [rows, nameRows] = await Promise.all([
    dbc
      .select({
        key: bookings.ticketTypeKey,
        bookings: count(),
        tickets: sum(bookings.people),
        revenue: sum(bookings.totalMinor),
      })
      .from(bookings)
      .where(eq(bookings.status, 'paid'))
      .groupBy(bookings.ticketTypeKey)
      .orderBy(bookings.ticketTypeKey),
    dbc
      .select({ key: ticketTypes.key, name: ticketTypes.name })
      .from(ticketTypes)
      .groupBy(ticketTypes.key, ticketTypes.name),
  ])

  const names = new Map<string, string>()
  for (const row of nameRows) {
    if (!names.has(row.key)) names.set(row.key, row.name)
  }

  return rows.map((row) => ({
    key: row.key,
    name: names.get(row.key) ?? row.key,
    bookings: Number(row.bookings ?? 0),
    tickets: Number(row.tickets ?? 0),
    revenueMinor: Number(row.revenue ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export interface ExportBookingRow {
  reference: string
  createdAt: string
  paidAt: string
  status: string
  eventName: string
  ticketTypeKey: string
  quantity: number
  people: number
  currency: string
  subtotalMinor: number
  discountMinor: number
  feeMinor: number
  totalMinor: number
  promoCode: string
  purchaserName: string
  purchaserEmail: string
}

export async function listBookingsForExport(limit = 5000): Promise<ExportBookingRow[]> {
  const dbc = database()
  const rows = await dbc
    .select({
      reference: bookings.reference,
      createdAt: bookings.createdAt,
      paidAt: bookings.paidAt,
      status: bookings.status,
      eventName: events.name,
      ticketTypeKey: bookings.ticketTypeKey,
      quantity: bookings.quantity,
      people: bookings.people,
      currency: bookings.currency,
      subtotalMinor: bookings.subtotalMinor,
      discountMinor: bookings.discountMinor,
      feeMinor: bookings.feeMinor,
      totalMinor: bookings.totalMinor,
      promoCode: bookings.promoCode,
      purchaser: bookings.purchaser,
    })
    .from(bookings)
    .leftJoin(events, eq(bookings.eventId, events.id))
    .orderBy(asc(bookings.createdAt))
    .limit(Math.min(Math.max(limit, 1), 20000))

  return rows.map((row) => ({
    reference: row.reference,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : '',
    status: row.status,
    eventName: row.eventName ?? '',
    ticketTypeKey: row.ticketTypeKey,
    quantity: row.quantity,
    people: row.people,
    currency: row.currency,
    subtotalMinor: row.subtotalMinor,
    discountMinor: row.discountMinor,
    feeMinor: row.feeMinor,
    totalMinor: row.totalMinor,
    promoCode: row.promoCode ?? '',
    purchaserName: `${row.purchaser.firstName} ${row.purchaser.lastName}`.trim(),
    purchaserEmail: row.purchaser.email,
  }))
}
