export type EventStatus =
  | 'draft'
  | 'scheduled'
  | 'on_sale'
  | 'sold_out'
  | 'ended'
  | 'cancelled'

export type TicketCategoryKey = 'standard' | 'group' | 'vip' | 'exclusive'

export interface Venue {
  name: string
  addressLine: string
  city: string
  country: string
  mapUrl?: string
}

export interface Category {
  key: string
  title: string
  blurb: string
  /** Route the category card links to. */
  href: string
  icon: string
}

export interface Highlight {
  title: string
  description: string
  icon: string
}

export interface TicketType {
  id: string
  key: TicketCategoryKey
  name: string
  tagline: string
  /** Price in the smallest currency unit (e.g. pence). */
  priceMinor: number
  /** For group/table pricing, the number of people included. */
  includesPeople: number
  benefits: string[]
  /** Group sizes offered for this ticket, if it is a group ticket. */
  groupSizes?: number[]
  /**
   * Optional explicit price per group size. When present it takes precedence
   * over multiplying the per-person price, so admins can model discounts.
   */
  groupPricing?: { size: number; totalMinor: number }[]
  capacity: number
  remaining: number
  onSale: boolean
  featured?: boolean
}

export interface FAQ {
  question: string
  answer: string
}

export interface EventFees {
  bookingFeePercent: number
  note: string
}

export interface EventSummary {
  id: string
  slug: string
  name: string
  tagline: string
  headline: string
  summary: string
  description: string
  /** Absolute ISO-8601 instant the event starts. */
  startAt: string
  /** Absolute ISO-8601 instant the event ends. */
  endAt: string
  timezone: string
  currency: string
  status: EventStatus
  venue: Venue
  heroImageUrl: string | null
  fees: EventFees
}

export interface EventDetail extends EventSummary {
  highlights: Highlight[]
  whyAttend: string[]
  categories: Category[]
  ticketTypes: TicketType[]
  performers: string[]
  rules: string[]
  accessibility: string[]
  faqs: FAQ[]
  featured?: boolean
}

export interface QuoteLine {
  label: string
  amountMinor: number
}

export interface Quote {
  eventSlug: string
  ticketTypeKey: TicketCategoryKey
  currency: string
  quantity: number
  groupSize: number | null
  people: number
  unitPriceMinor: number
  lines: QuoteLine[]
  subtotalMinor: number
  discountMinor: number
  feeMinor: number
  totalMinor: number
  promo: { code: string; label: string } | null
  feesNote: string
  available: boolean
  remaining: number
  maxQuantity: number
}

export interface QuoteRequest {
  eventSlug: string
  ticketTypeKey: TicketCategoryKey
  quantity: number
  groupSize?: number | null
  promoCode?: string | null
}

/** Attendee as captured during the booking flow. */
export interface AttendeeInput {
  fullName: string
  email?: string
}

export interface PurchaserInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  marketingOptIn: boolean
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: string
  marketingOptIn: boolean
  emailVerified: boolean
  createdAt: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
}

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  marketingOptIn?: boolean
}

export interface LoginInput {
  email: string
  password: string
}

// ---------------------------------------------------------------------------
// Bookings & payments
// ---------------------------------------------------------------------------

export type BookingStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'

export type PaymentProviderName = 'mock' | 'stripe'

export interface BookingTicket {
  id: string
  fullName: string
  email?: string
  ticketCode: string
  checkedInAt: string | null
}

export interface BookingDetail {
  reference: string
  status: BookingStatus
  eventSlug: string
  eventName: string
  eventStartAt: string
  eventTimezone: string
  venueName: string
  ticketTypeKey: TicketCategoryKey
  ticketTypeName: string
  quantity: number
  groupSize: number | null
  people: number
  currency: string
  unitPriceMinor: number
  subtotalMinor: number
  discountMinor: number
  feeMinor: number
  totalMinor: number
  promoCode: string | null
  purchaser: PurchaserInput
  tickets: BookingTicket[]
  paymentProvider: PaymentProviderName
  paidAt: string | null
  createdAt: string
}

export interface PaymentInit {
  provider: PaymentProviderName
  amountMinor: number
  currency: string
  paymentRef: string | null
  redirectUrl?: string
}

/** Lightweight booking record for history lists. */
export interface BookingSummary {
  reference: string
  status: BookingStatus
  eventSlug: string
  eventName: string
  eventStartAt: string
  eventTimezone: string
  venueName: string
  ticketTypeKey: TicketCategoryKey
  ticketTypeName: string
  quantity: number
  people: number
  totalMinor: number
  currency: string
  ticketCount: number
  paidAt: string | null
  createdAt: string
}

export interface CreateBookingInput {
  eventSlug: string
  ticketTypeKey: TicketCategoryKey
  quantity: number
  groupSize?: number | null
  promoCode?: string | null
  purchaser: PurchaserInput
  attendees: AttendeeInput[]
  idempotencyKey?: string
}

export interface CreateBookingResponse {
  booking: BookingDetail
  accessToken: string
  payment: PaymentInit
}

export interface MockConfirmResponse {
  booking: BookingDetail
  outcome: 'paid' | 'failed'
}

// ---------------------------------------------------------------------------
// Tickets & check-in
// ---------------------------------------------------------------------------

export type TicketScanStatus =
  | 'valid'
  | 'already_checked_in'
  | 'not_found'
  | 'not_paid'

export interface TicketScan {
  ticketId: string
  ticketCode: string
  attendeeName: string
  attendeeEmail: string | null
  checkedInAt: string | null
  bookingReference: string
  bookingStatus: BookingStatus
  ticketTypeKey: TicketCategoryKey
  ticketTypeName: string
  eventName: string
  eventSlug: string
  eventStartAt: string
  eventTimezone: string
  venueName: string
}

export interface TicketScanResult {
  status: TicketScanStatus
  scan: TicketScan | null
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type PromoKind = 'percent' | 'amount'

export interface Promo {
  code: string
  kind: PromoKind
  value: number
  label: string
  active: boolean
  minSubtotalMinor?: number
  maxDiscountMinor?: number
}

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

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export interface GalleryItem {
  id: string
  title: string
  caption: string
  imageUrl: string
  alt: string
  eventId: string | null
  eventName: string | null
  eventSlug: string | null
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface GalleryInput {
  title: string
  caption?: string
  imageUrl: string
  alt?: string
  eventId?: string | null
  sortOrder?: number
  published?: boolean
}

export interface UploadResult {
  url: string
  filename: string
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

export type SubscriberStatus = 'subscribed' | 'unsubscribed'

export interface NewsletterSubscriber {
  id: string
  email: string
  firstName: string | null
  status: SubscriberStatus
  source: string | null
  createdAt: string
  unsubscribedAt: string | null
}

export interface NewsletterListResult {
  subscribers: NewsletterSubscriber[]
  total: number
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface SalesPoint {
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

export interface TicketTypeBreakdown {
  key: string
  name: string
  bookings: number
  tickets: number
  revenueMinor: number
}
