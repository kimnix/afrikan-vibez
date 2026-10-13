import { featuredEvent } from '../data/event'
import type {
  AdminBookingListResult,
  AdminStats,
  AuthResponse,
  AuthUser,
  BookingDetail,
  BookingSummary,
  CreateBookingInput,
  CreateBookingResponse,
  EventDetail,
  EventInput,
  EventPerformance,
  EventSummary,
  GalleryInput,
  GalleryItem,
  LoginInput,
  MockConfirmResponse,
  NewsletterListResult,
  Promo,
  PromoInput,
  Quote,
  QuoteRequest,
  RegisterInput,
  SalesReport,
  TicketScanResult,
  TicketTypeBreakdown,
  TicketTypeInput,
  UploadResult,
} from '../types'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** How long to wait for the public event content before giving up. */
const EVENT_REQUEST_TIMEOUT_MS = 10_000

/**
 * Abort a request if the caller's signal fires (e.g. component unmount) or if it
 * does not settle within `ms`, so the UI never hangs on an unresponsive API.
 */
function withTimeout(
  signal: AbortSignal | undefined,
  ms = EVENT_REQUEST_TIMEOUT_MS,
): AbortSignal {
  const timeout = AbortSignal.timeout(ms)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  /** Bearer access token to attach to the request. */
  token?: string
}

/**
 * Thin JSON fetch wrapper. Sends cookies (for auth in later phases) and
 * normalises error handling. Callers should catch `ApiError`.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: Object.keys(headers).length ? headers : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  const isJson = res.headers
    .get('content-type')
    ?.includes('application/json')
  const payload = isJson ? await res.json() : null

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }

  return payload as T
}

/**
 * Fetch the featured event. In development it falls back to the bundled seed
 * while the API is offline; in production a failure propagates so the UI can
 * show an error instead of stale demo content.
 */
export async function getFeaturedEvent(signal?: AbortSignal): Promise<EventDetail> {
  try {
    return await apiRequest<EventDetail>('/api/events/featured', {
      signal: withTimeout(signal),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    if (import.meta.env.DEV) return featuredEvent
    throw err
  }
}

/** List published events. Falls back to the seed event only in development. */
export async function getEvents(signal?: AbortSignal): Promise<EventSummary[]> {
  try {
    return await apiRequest<EventSummary[]>('/api/events', { signal: withTimeout(signal) })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    if (import.meta.env.DEV) return [featuredEvent]
    throw err
  }
}

/**
 * Request a server-authoritative price quote. Throws `ApiError` with the
 * server's message for invalid selections or promotional codes.
 */
export async function getQuote(
  req: QuoteRequest,
  signal?: AbortSignal,
): Promise<Quote> {
  return apiRequest<Quote>('/api/quote', { method: 'POST', body: req, signal })
}

/** Fetch one event by slug. Falls back to the seed (development) if it matches. */
export async function getEventBySlug(
  slug: string,
  signal?: AbortSignal,
): Promise<EventDetail | null> {
  try {
    return await apiRequest<EventDetail>(`/api/events/${slug}`, { signal: withTimeout(signal) })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    if (import.meta.env.DEV) return slug === featuredEvent.slug ? featuredEvent : null
    throw err
  }
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: input,
  })
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: input,
  })
}

/** Rotate the refresh cookie for a new access token. Throws when signed out. */
export async function refreshSession(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/refresh', { method: 'POST' })
}

export async function logout(): Promise<void> {
  await apiRequest<null>('/api/auth/logout', { method: 'POST' })
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const result = await apiRequest<{ user: AuthUser }>('/api/auth/me', { token })
  return result.user
}

// ---------------------------------------------------------------------------
// Bookings & payments
// ---------------------------------------------------------------------------

/** Create a pending booking. The server re-quotes the order authoritatively. */
export async function createBooking(
  input: CreateBookingInput,
  token?: string,
): Promise<CreateBookingResponse> {
  return apiRequest<CreateBookingResponse>('/api/bookings', {
    method: 'POST',
    body: input,
    token,
  })
}

/** Fetch a booking with its opaque access token, or as its signed-in owner. */
export async function getBooking(
  reference: string,
  options: { bookingToken?: string; authToken?: string } = {},
  signal?: AbortSignal,
): Promise<BookingDetail> {
  const query = options.bookingToken
    ? `?token=${encodeURIComponent(options.bookingToken)}`
    : ''
  const result = await apiRequest<{ booking: BookingDetail }>(
    `/api/bookings/${encodeURIComponent(reference)}${query}`,
    { signal, token: options.authToken },
  )
  return result.booking
}

/** Booking history for the signed-in user. */
export async function listMyBookings(
  token: string,
  signal?: AbortSignal,
): Promise<BookingSummary[]> {
  const result = await apiRequest<{ bookings: BookingSummary[] }>('/api/bookings', {
    token,
    signal,
  })
  return result.bookings
}

/** Attach a guest booking to the signed-in account using its access token. */
export async function claimBooking(
  input: { reference: string; token: string },
  authToken: string,
): Promise<BookingDetail> {
  const result = await apiRequest<{ booking: BookingDetail }>('/api/bookings/claim', {
    method: 'POST',
    body: input,
    token: authToken,
  })
  return result.booking
}

/** Resolve a mock payment as succeeded or failed (PAYMENTS_MODE=mock). */
export async function confirmMockPayment(input: {
  reference: string
  token: string
  outcome: 'succeed' | 'fail'
}): Promise<MockConfirmResponse> {
  return apiRequest<MockConfirmResponse>('/api/payments/mock/confirm', {
    method: 'POST',
    body: input,
  })
}

// ---------------------------------------------------------------------------
// Tickets & check-in (staff/admin)
// ---------------------------------------------------------------------------

/** Look up a ticket without checking it in. */
export async function validateTicket(
  code: string,
  token: string,
): Promise<TicketScanResult> {
  return apiRequest<TicketScanResult>('/api/tickets/validate', {
    method: 'POST',
    body: { code },
    token,
  })
}

/** Check a ticket in (idempotent — repeat scans are reported, not re-applied). */
export async function checkInTicket(
  code: string,
  token: string,
): Promise<TicketScanResult> {
  return apiRequest<TicketScanResult>('/api/tickets/check-in', {
    method: 'POST',
    body: { code },
    token,
  })
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function getAdminStats(
  token: string,
  signal?: AbortSignal,
): Promise<AdminStats> {
  return apiRequest<AdminStats>('/api/admin/stats', { token, signal })
}

export async function listAdminEvents(
  token: string,
  signal?: AbortSignal,
): Promise<EventDetail[]> {
  const result = await apiRequest<{ events: EventDetail[] }>('/api/admin/events', {
    token,
    signal,
  })
  return result.events
}

export async function getAdminEvent(
  id: string,
  token: string,
  signal?: AbortSignal,
): Promise<EventDetail> {
  const result = await apiRequest<{ event: EventDetail }>(
    `/api/admin/events/${encodeURIComponent(id)}`,
    { token, signal },
  )
  return result.event
}

export async function createAdminEvent(
  input: EventInput,
  token: string,
): Promise<EventDetail> {
  const result = await apiRequest<{ event: EventDetail }>('/api/admin/events', {
    method: 'POST',
    body: input,
    token,
  })
  return result.event
}

export async function updateAdminEvent(
  id: string,
  input: Partial<EventInput>,
  token: string,
): Promise<EventDetail> {
  const result = await apiRequest<{ event: EventDetail }>(
    `/api/admin/events/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: input, token },
  )
  return result.event
}

export async function createAdminTicketType(
  eventId: string,
  input: TicketTypeInput,
  token: string,
): Promise<EventDetail> {
  const result = await apiRequest<{ event: EventDetail }>(
    `/api/admin/events/${encodeURIComponent(eventId)}/ticket-types`,
    { method: 'POST', body: input, token },
  )
  return result.event
}

export async function updateAdminTicketType(
  id: string,
  input: Partial<TicketTypeInput>,
  token: string,
): Promise<EventDetail> {
  const result = await apiRequest<{ event: EventDetail }>(
    `/api/admin/ticket-types/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: input, token },
  )
  return result.event
}

export async function listAdminBookings(
  params: { status?: string; eventId?: string; q?: string; limit?: number; offset?: number },
  token: string,
  signal?: AbortSignal,
): Promise<AdminBookingListResult> {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.eventId) search.set('eventId', params.eventId)
  if (params.q) search.set('q', params.q)
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.offset != null) search.set('offset', String(params.offset))
  const qs = search.toString()
  return apiRequest<AdminBookingListResult>(
    `/api/admin/bookings${qs ? `?${qs}` : ''}`,
    { token, signal },
  )
}

export async function getAdminBooking(
  reference: string,
  token: string,
  signal?: AbortSignal,
): Promise<BookingDetail> {
  const result = await apiRequest<{ booking: BookingDetail }>(
    `/api/admin/bookings/${encodeURIComponent(reference)}`,
    { token, signal },
  )
  return result.booking
}

export async function updateAdminBookingStatus(
  reference: string,
  status: 'refunded' | 'cancelled',
  token: string,
): Promise<BookingDetail> {
  const result = await apiRequest<{ booking: BookingDetail }>(
    `/api/admin/bookings/${encodeURIComponent(reference)}/status`,
    { method: 'POST', body: { status }, token },
  )
  return result.booking
}

export async function listAdminPromos(
  token: string,
  signal?: AbortSignal,
): Promise<Promo[]> {
  const result = await apiRequest<{ promos: Promo[] }>('/api/admin/promos', {
    token,
    signal,
  })
  return result.promos
}

export async function upsertAdminPromo(
  input: PromoInput,
  token: string,
): Promise<Promo> {
  const result = await apiRequest<{ promo: Promo }>('/api/admin/promos', {
    method: 'POST',
    body: input,
    token,
  })
  return result.promo
}

// ---------------------------------------------------------------------------
// Auth: email verification & password reset
// ---------------------------------------------------------------------------

export async function verifyEmail(token: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/verify-email', {
    method: 'POST',
    body: { token },
  })
}

export async function resendVerification(authToken: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/resend-verification', {
    method: 'POST',
    token: authToken,
  })
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
  })
}

export async function resetPassword(input: {
  token: string
  password: string
}): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/auth/reset-password', {
    method: 'POST',
    body: input,
  })
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

/** Published gallery media; returns an empty list while the API is offline. */
export async function getGallery(signal?: AbortSignal): Promise<GalleryItem[]> {
  try {
    const result = await apiRequest<{ items: GalleryItem[] }>('/api/gallery', { signal })
    return result.items
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    return []
  }
}

export async function listAdminGallery(
  token: string,
  signal?: AbortSignal,
): Promise<GalleryItem[]> {
  const result = await apiRequest<{ items: GalleryItem[] }>('/api/admin/gallery', {
    token,
    signal,
  })
  return result.items
}

export async function createAdminGalleryItem(
  input: GalleryInput,
  token: string,
): Promise<GalleryItem> {
  const result = await apiRequest<{ item: GalleryItem }>('/api/admin/gallery', {
    method: 'POST',
    body: input,
    token,
  })
  return result.item
}

export async function updateAdminGalleryItem(
  id: string,
  input: Partial<GalleryInput>,
  token: string,
): Promise<GalleryItem> {
  const result = await apiRequest<{ item: GalleryItem }>(
    `/api/admin/gallery/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: input, token },
  )
  return result.item
}

export async function deleteAdminGalleryItem(id: string, token: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(`/api/admin/gallery/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  })
}

/** Upload an image (as a data URL) and return its served URL. */
export async function uploadAdminImage(
  input: { dataUrl: string; filename?: string },
  token: string,
): Promise<UploadResult> {
  return apiRequest<UploadResult>('/api/admin/uploads', {
    method: 'POST',
    body: input,
    token,
  })
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

export async function subscribeNewsletter(input: {
  email: string
  consent: boolean
  source?: string
}): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/newsletter/subscribe', {
    method: 'POST',
    body: input,
  })
}

export async function unsubscribeNewsletter(token: string): Promise<void> {
  await apiRequest<{ ok: boolean }>('/api/newsletter/unsubscribe', {
    method: 'POST',
    body: { token },
  })
}

export async function listAdminSubscribers(
  params: { status?: string; limit?: number; offset?: number },
  token: string,
  signal?: AbortSignal,
): Promise<NewsletterListResult> {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.limit != null) search.set('limit', String(params.limit))
  if (params.offset != null) search.set('offset', String(params.offset))
  const qs = search.toString()
  return apiRequest<NewsletterListResult>(
    `/api/admin/subscribers${qs ? `?${qs}` : ''}`,
    { token, signal },
  )
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function getSalesReport(
  days: number,
  token: string,
  signal?: AbortSignal,
): Promise<SalesReport> {
  const result = await apiRequest<{ sales: SalesReport }>(
    `/api/admin/reports/sales?days=${encodeURIComponent(String(days))}`,
    { token, signal },
  )
  return result.sales
}

export async function getEventPerformance(
  token: string,
  signal?: AbortSignal,
): Promise<EventPerformance[]> {
  const result = await apiRequest<{ events: EventPerformance[] }>(
    '/api/admin/reports/events',
    { token, signal },
  )
  return result.events
}

export async function getTicketTypeBreakdown(
  token: string,
  signal?: AbortSignal,
): Promise<TicketTypeBreakdown[]> {
  const result = await apiRequest<{ ticketTypes: TicketTypeBreakdown[] }>(
    '/api/admin/reports/ticket-types',
    { token, signal },
  )
  return result.ticketTypes
}

/** Download a CSV report through an authenticated fetch and trigger a save. */
export async function downloadAdminReport(
  path: string,
  token: string,
  filename: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new ApiError(`Could not download report (${res.status})`, res.status)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
