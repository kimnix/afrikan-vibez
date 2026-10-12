import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, ilike, or, sql, sum } from 'drizzle-orm'
import type {
  BookingDetail,
  BookingStatus,
  Category,
  EventDetail,
  EventFees,
  EventStatus,
  FAQ,
  Highlight,
  Promo,
  PromoKind,
  TicketCategoryKey,
  Venue,
} from '../domain/types.js'
import { db } from './client.js'
import { BookingError, getBookingDetail } from './bookings.repo.js'
import { getEventById } from './events.repo.js'
import { bookingAttendees, bookings, events, promos, ticketTypes } from './schema.js'

export interface AdminStats {
  events: { total: number; active: number }
  bookings: Record<BookingStatus, number> & { total: number }
  revenueMinor: number
  currency: string
  ticketsSold: number
  checkedIn: number
  capacity: number
  remaining: number
}

export interface AdminBookingFilters {
  status?: BookingStatus
  eventId?: string
  search?: string
  limit: number
  offset: number
}

export interface AdminBookingListItem {
  reference: string
  status: BookingStatus
  eventId: string
  eventName: string
  purchaserName: string
  purchaserEmail: string
  people: number
  totalMinor: number
  currency: string
  createdAt: string
  paidAt: string | null
}

export interface AdminBookingListResult {
  bookings: AdminBookingListItem[]
  total: number
}

export interface EventInput {
  slug: string
  name: string
  tagline: string
  headline: string
  summary: string
  description: string
  startAt: string
  endAt: string
  timezone: string
  currency: string
  status: EventStatus
  venue: Venue
  heroImageUrl?: string | null
  fees: EventFees
  categories?: Category[]
  highlights?: Highlight[]
  whyAttend?: string[]
  performers?: string[]
  rules?: string[]
  accessibility?: string[]
  faqs?: FAQ[]
  featured?: boolean
}

export interface TicketTypeInput {
  key: TicketCategoryKey
  name: string
  tagline: string
  priceMinor: number
  includesPeople: number
  benefits?: string[]
  groupSizes?: number[] | null
  groupPricing?: { size: number; totalMinor: number }[] | null
  capacity: number
  remaining?: number
  onSale?: boolean
  featured?: boolean
  sortOrder?: number
}

export interface PromoInput {
  code: string
  kind: PromoKind
  value: number
  label: string
  active: boolean
  minSubtotalMinor?: number | null
  maxDiscountMinor?: number | null
}

function database() {
  if (!db) throw new BookingError(503, 'Database is not configured.')
  return db
}

function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (
      typeof current === 'object' &&
      'code' in current &&
      (current as { code?: string }).code === '23505'
    ) {
      return true
    }
    current =
      typeof current === 'object' && 'cause' in current
        ? (current as { cause?: unknown }).cause
        : undefined
  }
  return false
}

export async function getAdminStats(): Promise<AdminStats> {
  const dbc = database()

  const [eventAgg] = await dbc
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${events.status} in ('on_sale', 'scheduled'))`,
    })
    .from(events)

  const statusRows = await dbc
    .select({ status: bookings.status, total: count() })
    .from(bookings)
    .groupBy(bookings.status)

  const bookingCounts: Record<BookingStatus, number> & { total: number } = {
    pending: 0,
    paid: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
    total: 0,
  }
  for (const row of statusRows) {
    const status = row.status as BookingStatus
    if (status in bookingCounts) bookingCounts[status] = Number(row.total)
    bookingCounts.total += Number(row.total)
  }

  const [paidAgg] = await dbc
    .select({
      revenue: sum(bookings.totalMinor),
      tickets: sum(bookings.people),
      currency: sql<string>`coalesce(min(${bookings.currency}), 'gbp')`,
    })
    .from(bookings)
    .where(eq(bookings.status, 'paid'))

  const [checkedAgg] = await dbc
    .select({ total: count() })
    .from(bookingAttendees)
    .where(sql`${bookingAttendees.checkedInAt} is not null`)

  const [capacityAgg] = await dbc
    .select({
      capacity: sum(ticketTypes.capacity),
      remaining: sum(ticketTypes.remaining),
    })
    .from(ticketTypes)

  return {
    events: { total: Number(eventAgg?.total ?? 0), active: Number(eventAgg?.active ?? 0) },
    bookings: bookingCounts,
    revenueMinor: Number(paidAgg?.revenue ?? 0),
    currency: paidAgg?.currency ?? 'gbp',
    ticketsSold: Number(paidAgg?.tickets ?? 0),
    checkedIn: Number(checkedAgg?.total ?? 0),
    capacity: Number(capacityAgg?.capacity ?? 0),
    remaining: Number(capacityAgg?.remaining ?? 0),
  }
}

export async function listAdminBookings(
  filters: AdminBookingFilters,
): Promise<AdminBookingListResult> {
  const dbc = database()

  const conditions = []
  if (filters.status) conditions.push(eq(bookings.status, filters.status))
  if (filters.eventId) conditions.push(eq(bookings.eventId, filters.eventId))
  if (filters.search) {
    const like = `%${filters.search}%`
    conditions.push(
      or(
        ilike(bookings.reference, like),
        sql`${bookings.purchaser}->>'email' ilike ${like}`,
        sql`${bookings.purchaser}->>'firstName' ilike ${like}`,
        sql`${bookings.purchaser}->>'lastName' ilike ${like}`,
      ),
    )
  }
  const where = conditions.length ? and(...conditions) : undefined

  const [totalRow] = await dbc.select({ total: count() }).from(bookings).where(where)

  const rows = await dbc
    .select({
      reference: bookings.reference,
      status: bookings.status,
      eventId: bookings.eventId,
      eventName: events.name,
      purchaser: bookings.purchaser,
      people: bookings.people,
      totalMinor: bookings.totalMinor,
      currency: bookings.currency,
      createdAt: bookings.createdAt,
      paidAt: bookings.paidAt,
    })
    .from(bookings)
    .leftJoin(events, eq(bookings.eventId, events.id))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(filters.limit)
    .offset(filters.offset)

  return {
    total: Number(totalRow?.total ?? 0),
    bookings: rows.map((row) => ({
      reference: row.reference,
      status: row.status as BookingStatus,
      eventId: row.eventId,
      eventName: row.eventName ?? '',
      purchaserName: `${row.purchaser.firstName} ${row.purchaser.lastName}`.trim(),
      purchaserEmail: row.purchaser.email,
      people: row.people,
      totalMinor: row.totalMinor,
      currency: row.currency,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    })),
  }
}

export async function getAdminBooking(reference: string): Promise<BookingDetail> {
  const detail = await getBookingDetail(reference)
  if (!detail) throw new BookingError(404, 'Booking not found.')
  return detail
}

/**
 * Refund or cancel a booking. Paid bookings release their inventory back to the
 * ticket type (capped at capacity).
 */
export async function updateBookingStatus(
  reference: string,
  status: Extract<BookingStatus, 'refunded' | 'cancelled'>,
): Promise<BookingDetail> {
  const dbc = database()

  const [row] = await dbc
    .select()
    .from(bookings)
    .where(eq(bookings.reference, reference))
    .limit(1)
  if (!row) throw new BookingError(404, 'Booking not found.')

  if (row.status !== status) {
    if (row.status === 'paid') {
      await dbc
        .update(ticketTypes)
        .set({
          remaining: sql`least(${ticketTypes.capacity}, ${ticketTypes.remaining} + ${row.people})`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ticketTypes.eventId, row.eventId),
            eq(ticketTypes.key, row.ticketTypeKey),
          ),
        )
    }
    await dbc
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, row.id))
  }

  return getAdminBooking(reference)
}

export async function createEvent(input: EventInput): Promise<EventDetail> {
  const dbc = database()
  const id = `evt_${randomUUID()}`

  try {
    await dbc.insert(events).values({
      id,
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      headline: input.headline,
      summary: input.summary,
      description: input.description,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      timezone: input.timezone,
      currency: input.currency,
      status: input.status,
      venue: input.venue,
      heroImageUrl: input.heroImageUrl ?? null,
      fees: input.fees,
      categories: input.categories ?? [],
      highlights: input.highlights ?? [],
      whyAttend: input.whyAttend ?? [],
      performers: input.performers ?? [],
      rules: input.rules ?? [],
      accessibility: input.accessibility ?? [],
      faqs: input.faqs ?? [],
      featured: input.featured ?? false,
      updatedAt: new Date(),
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new BookingError(409, 'That event slug is already in use.')
    }
    throw err
  }

  const event = await getEventById(id)
  if (!event) throw new BookingError(500, 'Could not create the event.')
  return event
}

export async function updateEvent(
  id: string,
  input: Partial<EventInput>,
): Promise<EventDetail> {
  const dbc = database()

  const updates: Partial<typeof events.$inferInsert> = { updatedAt: new Date() }
  if (input.slug !== undefined) updates.slug = input.slug
  if (input.name !== undefined) updates.name = input.name
  if (input.tagline !== undefined) updates.tagline = input.tagline
  if (input.headline !== undefined) updates.headline = input.headline
  if (input.summary !== undefined) updates.summary = input.summary
  if (input.description !== undefined) updates.description = input.description
  if (input.startAt !== undefined) updates.startAt = new Date(input.startAt)
  if (input.endAt !== undefined) updates.endAt = new Date(input.endAt)
  if (input.timezone !== undefined) updates.timezone = input.timezone
  if (input.currency !== undefined) updates.currency = input.currency
  if (input.status !== undefined) updates.status = input.status
  if (input.venue !== undefined) updates.venue = input.venue
  if (input.heroImageUrl !== undefined) updates.heroImageUrl = input.heroImageUrl
  if (input.fees !== undefined) updates.fees = input.fees
  if (input.categories !== undefined) updates.categories = input.categories
  if (input.highlights !== undefined) updates.highlights = input.highlights
  if (input.whyAttend !== undefined) updates.whyAttend = input.whyAttend
  if (input.performers !== undefined) updates.performers = input.performers
  if (input.rules !== undefined) updates.rules = input.rules
  if (input.accessibility !== undefined) updates.accessibility = input.accessibility
  if (input.faqs !== undefined) updates.faqs = input.faqs
  if (input.featured !== undefined) updates.featured = input.featured

  try {
    const result = await dbc
      .update(events)
      .set(updates)
      .where(eq(events.id, id))
      .returning({ id: events.id })
    if (!result.length) throw new BookingError(404, 'Event not found.')
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new BookingError(409, 'That event slug is already in use.')
    }
    throw err
  }

  const event = await getEventById(id)
  if (!event) throw new BookingError(404, 'Event not found.')
  return event
}

export async function createTicketType(
  eventId: string,
  input: TicketTypeInput,
): Promise<EventDetail> {
  const dbc = database()

  const event = await getEventById(eventId)
  if (!event) throw new BookingError(404, 'Event not found.')

  const [maxRow] = await dbc
    .select({ max: sql<number>`coalesce(max(${ticketTypes.sortOrder}), -1)` })
    .from(ticketTypes)
    .where(eq(ticketTypes.eventId, eventId))

  try {
    await dbc.insert(ticketTypes).values({
      id: `tt_${randomUUID()}`,
      eventId,
      key: input.key,
      name: input.name,
      tagline: input.tagline,
      priceMinor: input.priceMinor,
      includesPeople: input.includesPeople,
      benefits: input.benefits ?? [],
      groupSizes: input.groupSizes ?? null,
      groupPricing: input.groupPricing ?? null,
      capacity: input.capacity,
      remaining: input.remaining ?? input.capacity,
      onSale: input.onSale ?? true,
      featured: input.featured ?? false,
      sortOrder: input.sortOrder ?? Number(maxRow?.max ?? -1) + 1,
      updatedAt: new Date(),
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new BookingError(409, 'That ticket key already exists for this event.')
    }
    throw err
  }

  const updated = await getEventById(eventId)
  if (!updated) throw new BookingError(500, 'Could not create the ticket type.')
  return updated
}

export async function updateTicketType(
  id: string,
  input: Partial<TicketTypeInput>,
): Promise<EventDetail> {
  const dbc = database()

  const [row] = await dbc
    .select()
    .from(ticketTypes)
    .where(eq(ticketTypes.id, id))
    .limit(1)
  if (!row) throw new BookingError(404, 'Ticket type not found.')

  const updates: Partial<typeof ticketTypes.$inferInsert> = { updatedAt: new Date() }
  if (input.key !== undefined) updates.key = input.key
  if (input.name !== undefined) updates.name = input.name
  if (input.tagline !== undefined) updates.tagline = input.tagline
  if (input.priceMinor !== undefined) updates.priceMinor = input.priceMinor
  if (input.includesPeople !== undefined) updates.includesPeople = input.includesPeople
  if (input.benefits !== undefined) updates.benefits = input.benefits
  if (input.groupSizes !== undefined) updates.groupSizes = input.groupSizes
  if (input.groupPricing !== undefined) updates.groupPricing = input.groupPricing
  if (input.capacity !== undefined) updates.capacity = input.capacity
  if (input.remaining !== undefined) updates.remaining = input.remaining
  if (input.onSale !== undefined) updates.onSale = input.onSale
  if (input.featured !== undefined) updates.featured = input.featured
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder

  try {
    await dbc.update(ticketTypes).set(updates).where(eq(ticketTypes.id, id))
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new BookingError(409, 'That ticket key already exists for this event.')
    }
    throw err
  }

  const event = await getEventById(row.eventId)
  if (!event) throw new BookingError(404, 'Event not found.')
  return event
}

export async function listAllPromos(): Promise<Promo[]> {
  const dbc = database()
  const rows = await dbc.select().from(promos).orderBy(asc(promos.code))
  return rows.map((row) => ({
    code: row.code,
    kind: row.kind,
    value: row.value,
    label: row.label,
    active: row.active,
    minSubtotalMinor: row.minSubtotalMinor ?? undefined,
    maxDiscountMinor: row.maxDiscountMinor ?? undefined,
  }))
}

export async function upsertPromo(input: PromoInput): Promise<Promo> {
  const dbc = database()
  const code = input.code.trim().toUpperCase()

  const values = {
    code,
    kind: input.kind,
    value: input.value,
    label: input.label,
    active: input.active,
    minSubtotalMinor: input.minSubtotalMinor ?? null,
    maxDiscountMinor: input.maxDiscountMinor ?? null,
    updatedAt: new Date(),
  }
  await dbc
    .insert(promos)
    .values(values)
    .onConflictDoUpdate({ target: promos.code, set: values })

  return {
    code,
    kind: input.kind,
    value: input.value,
    label: input.label,
    active: input.active,
    minSubtotalMinor: input.minSubtotalMinor ?? undefined,
    maxDiscountMinor: input.maxDiscountMinor ?? undefined,
  }
}
