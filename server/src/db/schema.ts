import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type {
  Category,
  EventFees,
  FAQ,
  Highlight,
  PromoKind,
  Purchaser,
  Venue,
} from '../domain/types.js'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

// ---------------------------------------------------------------------------
// Accounts & sessions
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  /** 'customer' | 'admin' */
  role: text('role').notNull().default('customer'),
  marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  ...timestamps,
})

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 hash of the opaque refresh token (the raw value is never stored). */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('refresh_tokens_user_idx').on(table.userId)],
)

// ---------------------------------------------------------------------------
// Events, ticket types & promotional codes
// ---------------------------------------------------------------------------

export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    tagline: text('tagline').notNull(),
    headline: text('headline').notNull(),
    summary: text('summary').notNull(),
    description: text('description').notNull(),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    timezone: text('timezone').notNull(),
    currency: text('currency').notNull(),
    /** 'draft' | 'scheduled' | 'on_sale' | 'sold_out' | 'ended' | 'cancelled' */
    status: text('status').notNull().default('draft'),
    venue: jsonb('venue').$type<Venue>().notNull(),
    heroImageUrl: text('hero_image_url'),
    fees: jsonb('fees').$type<EventFees>().notNull(),
    categories: jsonb('categories').$type<Category[]>().notNull().default([]),
    highlights: jsonb('highlights').$type<Highlight[]>().notNull().default([]),
    whyAttend: jsonb('why_attend').$type<string[]>().notNull().default([]),
    performers: jsonb('performers').$type<string[]>().notNull().default([]),
    rules: jsonb('rules').$type<string[]>().notNull().default([]),
    accessibility: jsonb('accessibility').$type<string[]>().notNull().default([]),
    faqs: jsonb('faqs').$type<FAQ[]>().notNull().default([]),
    featured: boolean('featured').notNull().default(false),
    ...timestamps,
  },
  (table) => [index('events_status_idx').on(table.status)],
)

export const ticketTypes = pgTable(
  'ticket_types',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    tagline: text('tagline').notNull(),
    /** Price in the smallest currency unit (e.g. pence). */
    priceMinor: integer('price_minor').notNull(),
    includesPeople: integer('includes_people').notNull().default(1),
    benefits: jsonb('benefits').$type<string[]>().notNull().default([]),
    groupSizes: jsonb('group_sizes').$type<number[]>(),
    groupPricing: jsonb('group_pricing').$type<{ size: number; totalMinor: number }[]>(),
    capacity: integer('capacity').notNull(),
    remaining: integer('remaining').notNull(),
    onSale: boolean('on_sale').notNull().default(true),
    featured: boolean('featured').notNull().default(false),
    /** Display order within an event's ticket options. */
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('ticket_types_event_key_uq').on(table.eventId, table.key),
  ],
)

export const promos = pgTable('promos', {
  code: text('code').primaryKey(),
  kind: text('kind').$type<PromoKind>().notNull(),
  /** percent: 1-100. amount: minor units. */
  value: integer('value').notNull(),
  label: text('label').notNull(),
  active: boolean('active').notNull().default(true),
  minSubtotalMinor: integer('min_subtotal_minor'),
  maxDiscountMinor: integer('max_discount_minor'),
  ...timestamps,
})

// ---------------------------------------------------------------------------
// Bookings & issued tickets
// ---------------------------------------------------------------------------

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Human-readable, unguessable reference shown to the customer. */
    reference: text('reference').notNull().unique(),
    /** SHA-256 hash of the opaque token granting access to this booking. */
    accessTokenHash: text('access_token_hash').notNull(),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    ticketTypeKey: text('ticket_type_key').notNull(),
    quantity: integer('quantity').notNull(),
    groupSize: integer('group_size'),
    people: integer('people').notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    subtotalMinor: integer('subtotal_minor').notNull(),
    discountMinor: integer('discount_minor').notNull().default(0),
    feeMinor: integer('fee_minor').notNull(),
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull(),
    promoCode: text('promo_code'),
    /** 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' */
    status: text('status').notNull().default('pending'),
    /** 'mock' | 'stripe' */
    paymentProvider: text('payment_provider').notNull().default('mock'),
    paymentRef: text('payment_ref'),
    idempotencyKey: text('idempotency_key').unique(),
    purchaser: jsonb('purchaser').$type<Purchaser>().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('bookings_event_idx').on(table.eventId),
    index('bookings_user_idx').on(table.userId),
  ],
)

export const bookingAttendees = pgTable(
  'booking_attendees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email'),
    /** Opaque code embedded in the attendee's QR ticket. */
    ticketCode: text('ticket_code').notNull().unique(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('booking_attendees_booking_idx').on(table.bookingId)],
)

// ---------------------------------------------------------------------------
// Newsletter subscribers
// ---------------------------------------------------------------------------

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  /** 'subscribed' | 'unsubscribed' */
  status: text('status').notNull().default('subscribed'),
  source: text('source'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  /** SHA-256 hash of the opaque unsubscribe token (the raw value is never stored). */
  unsubscribeTokenHash: text('unsubscribe_token_hash').notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  ...timestamps,
})

// ---------------------------------------------------------------------------
// Gallery media
// ---------------------------------------------------------------------------

export const galleryItems = pgTable(
  'gallery_items',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    caption: text('caption').notNull().default(''),
    imageUrl: text('image_url').notNull(),
    alt: text('alt').notNull().default(''),
    eventId: text('event_id').references(() => events.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    published: boolean('published').notNull().default(true),
    ...timestamps,
  },
  (table) => [index('gallery_items_sort_idx').on(table.sortOrder)],
)

// ---------------------------------------------------------------------------
// One-time auth tokens (email verification & password reset)
// ---------------------------------------------------------------------------

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'email_verify' | 'password_reset' */
    kind: text('kind').notNull(),
    /** SHA-256 hash of the opaque token (the raw value is emailed, never stored). */
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('auth_tokens_user_idx').on(table.userId),
    index('auth_tokens_kind_idx').on(table.kind),
  ],
)

// Row types for the repositories.
export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
export type RefreshTokenRow = typeof refreshTokens.$inferSelect
export type EventRow = typeof events.$inferSelect
export type TicketTypeRow = typeof ticketTypes.$inferSelect
export type PromoRow = typeof promos.$inferSelect
export type BookingRow = typeof bookings.$inferSelect
export type BookingAttendeeRow = typeof bookingAttendees.$inferSelect
export type NewsletterSubscriberRow = typeof newsletterSubscribers.$inferSelect
export type GalleryItemRow = typeof galleryItems.$inferSelect
export type AuthTokenRow = typeof authTokens.$inferSelect
