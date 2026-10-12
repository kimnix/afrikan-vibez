import { and, eq, getTableName, sql } from 'drizzle-orm'
import { db } from '../../src/db/client.js'
import {
  authTokens,
  bookingAttendees,
  bookings,
  events,
  galleryItems,
  newsletterSubscribers,
  promos,
  refreshTokens,
  ticketTypes,
} from '../../src/db/schema.js'

/** Every table, so a reset can truncate them all in one statement. */
const TABLES = [
  bookingAttendees,
  bookings,
  ticketTypes,
  promos,
  events,
  authTokens,
  refreshTokens,
  galleryItems,
  newsletterSubscribers,
]

export function requireTestDb() {
  if (!db) throw new Error('Test database is not configured (DATABASE_URL missing).')
  return db
}

/**
 * Whether the test database is reachable and migrated. Used to skip the
 * integration suite cleanly on machines without Postgres.
 */
export async function isIntegrationDbReady(): Promise<boolean> {
  if (!db) return false
  try {
    await db.execute(sql`select 1 from ${events} limit 0`)
    return true
  } catch {
    return false
  }
}

/** Wipe all data between tests, restarting identity where applicable. */
export async function resetDatabase(): Promise<void> {
  const database = requireTestDb()
  const names = TABLES.map((table) => `"${getTableName(table)}"`).join(', ')
  await database.execute(sql.raw(`truncate table ${names} cascade`))
}

export interface EventFixture {
  eventId: string
  standardId: string
  groupId: string
}

/** Insert a minimal on-sale event with a standard and a group ticket type. */
export async function seedEvent(options?: {
  standardRemaining?: number
  standardCapacity?: number
}): Promise<EventFixture> {
  const database = requireTestDb()
  const eventId = 'evt_test'
  const standardCapacity = options?.standardCapacity ?? 10

  await database.insert(events).values({
    id: eventId,
    slug: 'test-event',
    name: 'Test Event',
    tagline: 'A test event',
    headline: 'Test',
    summary: 'Summary',
    description: 'Description',
    startAt: new Date('2027-07-18T15:00:00.000Z'),
    endAt: new Date('2027-07-19T02:00:00.000Z'),
    timezone: 'Europe/London',
    currency: 'gbp',
    status: 'on_sale',
    venue: { name: 'The Grand Arena', addressLine: '1 Riverside Way', city: 'London', country: 'UK' },
    fees: { bookingFeePercent: 1.5, note: 'Fees apply.' },
    featured: true,
  })

  await database.insert(ticketTypes).values([
    {
      id: 'tt_standard',
      eventId,
      key: 'standard',
      name: 'Standard Ticket',
      tagline: 'General admission',
      priceMinor: 3000,
      includesPeople: 1,
      capacity: standardCapacity,
      remaining: options?.standardRemaining ?? standardCapacity,
      onSale: true,
      sortOrder: 0,
    },
    {
      id: 'tt_group',
      eventId,
      key: 'group',
      name: 'Group Ticket',
      tagline: 'Bring the crew',
      priceMinor: 2500,
      includesPeople: 4,
      groupSizes: [4, 6],
      groupPricing: [
        { size: 4, totalMinor: 9600 },
        { size: 6, totalMinor: 14000 },
      ],
      capacity: 8,
      remaining: 8,
      onSale: true,
      sortOrder: 1,
    },
  ])

  return { eventId, standardId: 'tt_standard', groupId: 'tt_group' }
}

export async function remainingOf(
  eventId: string,
  ticketTypeKey: string,
): Promise<number> {
  const database = requireTestDb()
  const [row] = await database
    .select({ remaining: ticketTypes.remaining })
    .from(ticketTypes)
    .where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.key, ticketTypeKey)))
    .limit(1)
  if (!row) throw new Error(`Ticket type ${ticketTypeKey} not found.`)
  return row.remaining
}
