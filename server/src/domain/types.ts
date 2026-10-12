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
  includesPeople: number
  benefits: string[]
  groupSizes?: number[]
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
  /** Percentage of the (discounted) subtotal added as a booking fee. */
  bookingFeePercent: number
  /** Human-readable note about fees and taxes. */
  note: string
}

export interface EventDetail {
  id: string
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
  heroImageUrl: string | null
  fees: EventFees
  categories: Category[]
  highlights: Highlight[]
  whyAttend: string[]
  ticketTypes: TicketType[]
  performers: string[]
  rules: string[]
  accessibility: string[]
  faqs: FAQ[]
  featured?: boolean
}

export type PromoKind = 'percent' | 'amount'

export interface Promo {
  code: string
  kind: PromoKind
  /** percent: 1-100. amount: minor units. */
  value: number
  label: string
  active: boolean
  /** Optional minimum subtotal (minor units) required to use the code. */
  minSubtotalMinor?: number
  /** Optional cap for percentage discounts (minor units). */
  maxDiscountMinor?: number
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

export interface Purchaser {
  firstName: string
  lastName: string
  email: string
  phone?: string
  marketingOptIn: boolean
}

export interface Attendee {
  fullName: string
  email?: string
}

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
  purchaser: Purchaser
  tickets: BookingTicket[]
  paymentProvider: PaymentProviderName
  paidAt: string | null
  createdAt: string
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
