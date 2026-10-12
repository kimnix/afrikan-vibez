import { and, asc, count, desc, eq } from 'drizzle-orm'
import { db } from './client.js'
import { DatabaseUnavailableError } from './users.repo.js'
import {
  newsletterSubscribers,
  type NewsletterSubscriberRow,
} from './schema.js'

function requireDb() {
  if (!db) throw new DatabaseUnavailableError()
  return db
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function findSubscriberByEmail(
  email: string,
): Promise<NewsletterSubscriberRow | undefined> {
  const database = requireDb()
  const [row] = await database
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, normaliseEmail(email)))
    .limit(1)
  return row
}

export interface SubscribeInput {
  email: string
  firstName?: string | null
  source?: string | null
  userId?: string | null
  unsubscribeTokenHash: string
}

/**
 * Add or re-activate a subscriber. Idempotent: subscribing an existing address
 * keeps one row, marks it subscribed and rotates its unsubscribe token.
 */
export async function upsertSubscriber(
  input: SubscribeInput,
): Promise<{ subscriber: NewsletterSubscriberRow; created: boolean }> {
  const database = requireDb()
  const email = normaliseEmail(input.email)
  const existing = await findSubscriberByEmail(email)

  if (existing) {
    const [row] = await database
      .update(newsletterSubscribers)
      .set({
        status: 'subscribed',
        unsubscribedAt: null,
        unsubscribeTokenHash: input.unsubscribeTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.id, existing.id))
      .returning()
    return { subscriber: row!, created: false }
  }

  const [row] = await database
    .insert(newsletterSubscribers)
    .values({
      email,
      firstName: input.firstName ?? null,
      source: input.source ?? null,
      userId: input.userId ?? null,
      unsubscribeTokenHash: input.unsubscribeTokenHash,
      confirmedAt: new Date(),
    })
    .returning()
  return { subscriber: row!, created: true }
}

/** Unsubscribe using the hash of the token embedded in the email link. */
export async function unsubscribeByTokenHash(tokenHash: string): Promise<boolean> {
  const database = requireDb()
  const [row] = await database
    .select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeTokenHash, tokenHash))
    .limit(1)
  if (!row) return false

  await database
    .update(newsletterSubscribers)
    .set({ status: 'unsubscribed', unsubscribedAt: new Date(), updatedAt: new Date() })
    .where(eq(newsletterSubscribers.id, row.id))
  return true
}

export interface SubscriberFilters {
  status?: 'subscribed' | 'unsubscribed'
  limit?: number
  offset?: number
}

export interface SubscriberListResult {
  subscribers: NewsletterSubscriberRow[]
  total: number
}

export async function listSubscribers(
  filters: SubscriberFilters = {},
): Promise<SubscriberListResult> {
  const database = requireDb()
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)
  const where = filters.status ? eq(newsletterSubscribers.status, filters.status) : undefined

  const [rows, [totals]] = await Promise.all([
    database
      .select()
      .from(newsletterSubscribers)
      .where(where)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(limit)
      .offset(offset),
    database.select({ value: count() }).from(newsletterSubscribers).where(where),
  ])

  return { subscribers: rows, total: Number(totals?.value ?? 0) }
}

export async function countActiveSubscribers(): Promise<number> {
  const database = requireDb()
  const [totals] = await database
    .select({ value: count() })
    .from(newsletterSubscribers)
    .where(and(eq(newsletterSubscribers.status, 'subscribed')))
  return Number(totals?.value ?? 0)
}

/** All subscribers (bounded) for CSV export, oldest first. */
export async function listSubscribersForExport(limit = 20000): Promise<NewsletterSubscriberRow[]> {
  const database = requireDb()
  return database
    .select()
    .from(newsletterSubscribers)
    .orderBy(asc(newsletterSubscribers.createdAt))
    .limit(Math.min(Math.max(limit, 1), 50000))
}
