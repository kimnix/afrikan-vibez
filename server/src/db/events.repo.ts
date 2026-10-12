import { asc, eq } from 'drizzle-orm'
import {
  events as seedEvents,
  featuredEvent as seedFeaturedEvent,
  findEventBySlug as findSeedEventBySlug,
  promos as seedPromos,
} from '../domain/eventSeed.js'
import type {
  EventDetail,
  EventStatus,
  Promo,
  TicketCategoryKey,
  TicketType,
} from '../domain/types.js'
import { db } from './client.js'
import {
  events as eventsTable,
  promos as promosTable,
  ticketTypes as ticketTypesTable,
  type EventRow,
  type PromoRow,
  type TicketTypeRow,
} from './schema.js'

/**
 * Run a database query, falling back to seed data when the database is not
 * configured or the query fails, so the API is always available in development.
 */
async function safe<T>(query: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!db) return fallback()
  try {
    const result = await query()
    if (Array.isArray(result) && result.length === 0) return fallback()
    return result
  } catch (err) {
    console.error('[db] query failed, using seed fallback:', (err as Error).message)
    return fallback()
  }
}

function toTicketType(row: TicketTypeRow): TicketType {
  return {
    id: row.id,
    key: row.key as TicketCategoryKey,
    name: row.name,
    tagline: row.tagline,
    priceMinor: row.priceMinor,
    includesPeople: row.includesPeople,
    benefits: row.benefits,
    groupSizes: row.groupSizes ?? undefined,
    groupPricing: row.groupPricing ?? undefined,
    capacity: row.capacity,
    remaining: row.remaining,
    onSale: row.onSale,
    featured: row.featured || undefined,
  }
}

function toEventDetail(row: EventRow, types: TicketTypeRow[]): EventDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    headline: row.headline,
    summary: row.summary,
    description: row.description,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    timezone: row.timezone,
    currency: row.currency,
    status: row.status as EventStatus,
    venue: row.venue,
    heroImageUrl: row.heroImageUrl,
    fees: row.fees,
    categories: row.categories,
    highlights: row.highlights,
    whyAttend: row.whyAttend,
    ticketTypes: types.map(toTicketType),
    performers: row.performers,
    rules: row.rules,
    accessibility: row.accessibility,
    faqs: row.faqs,
    featured: row.featured,
  }
}

function toPromo(row: PromoRow): Promo {
  return {
    code: row.code,
    kind: row.kind,
    value: row.value,
    label: row.label,
    active: row.active,
    minSubtotalMinor: row.minSubtotalMinor ?? undefined,
    maxDiscountMinor: row.maxDiscountMinor ?? undefined,
  }
}

async function loadTicketTypes(eventId: string): Promise<TicketTypeRow[]> {
  if (!db) return []
  return db
    .select()
    .from(ticketTypesTable)
    .where(eq(ticketTypesTable.eventId, eventId))
    .orderBy(asc(ticketTypesTable.sortOrder))
}

/** All events for listing, ordered by start time. */
export async function listEvents(): Promise<EventDetail[]> {
  return safe(
    async () => {
      const rows = await db!
        .select()
        .from(eventsTable)
        .orderBy(asc(eventsTable.startAt))
      return Promise.all(
        rows.map(async (row) => toEventDetail(row, await loadTicketTypes(row.id))),
      )
    },
    () => seedEvents,
  )
}

export async function getEventBySlug(slug: string): Promise<EventDetail | undefined> {
  const fromSeed = () => findSeedEventBySlug(slug)
  if (!db) return fromSeed()
  try {
    const [row] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.slug, slug))
      .limit(1)
    if (!row) return fromSeed()
    return toEventDetail(row, await loadTicketTypes(row.id))
  } catch (err) {
    console.error('[db] query failed, using seed fallback:', (err as Error).message)
    return fromSeed()
  }
}

/** Fetch one event by primary key (admin). */
export async function getEventById(id: string): Promise<EventDetail | undefined> {
  if (!db) return seedEvents.find((e) => e.id === id)
  const [row] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, id))
    .limit(1)
  if (!row) return undefined
  return toEventDetail(row, await loadTicketTypes(row.id))
}

/** The featured event, or the first event, falling back to the seed. */
export async function getFeaturedEvent(): Promise<EventDetail | undefined> {
  return safe(
    async () => {
      const [featured] = await db!
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.featured, true))
        .limit(1)
      const row =
        featured ??
        (await db!.select().from(eventsTable).orderBy(asc(eventsTable.startAt)).limit(1))[0]
      if (!row) return undefined
      return toEventDetail(row, await loadTicketTypes(row.id))
    },
    () => seedFeaturedEvent,
  )
}

/** Active promotional codes. */
export async function listActivePromos(): Promise<Promo[]> {
  return safe(
    async () => {
      const rows = await db!
        .select()
        .from(promosTable)
        .where(eq(promosTable.active, true))
      return rows.map(toPromo)
    },
    () => seedPromos.filter((p) => p.active),
  )
}
