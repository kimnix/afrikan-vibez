import { Router, type Request } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { optionalAuth, requireAuth } from '../auth/middleware.js'
import { getEventBySlug, listActivePromos } from '../db/events.repo.js'
import {
  BookingError,
  claimBooking,
  createBooking,
  getBookingDetail,
  findBookingRow,
  listUserBookings,
  setBookingPaymentRef,
  verifyBookingAccess,
} from '../db/bookings.repo.js'
import { computeQuote, PricingError } from '../domain/pricing.js'
import { getPaymentGateway } from '../payments/gateway.js'

const bookSchema = z.object({
  eventSlug: z.string().min(1).max(200),
  ticketTypeKey: z.enum(['standard', 'group', 'vip', 'exclusive']),
  quantity: z.number().int().min(1).max(10),
  groupSize: z.number().int().positive().nullable().optional(),
  promoCode: z.string().max(40).nullable().optional(),
  purchaser: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email().max(160),
    phone: z.string().max(40).optional(),
    marketingOptIn: z.boolean(),
  }),
  attendees: z
    .array(
      z.object({
        fullName: z.string().min(1).max(120),
        email: z.string().email().max(160).optional(),
      }),
    )
    .min(1)
    .max(50),
  idempotencyKey: z.string().min(8).max(100).optional(),
})

export const bookingsRouter = Router()

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

/**
 * Create a pending booking and start payment. The server re-quotes the order
 * authoritatively; prices sent from the browser are ignored.
 */
bookingsRouter.post('/bookings', bookingLimiter, optionalAuth, async (req, res) => {
  const parsed = bookSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid booking request.' })
  }
  const data = parsed.data

  const event = await getEventBySlug(data.eventSlug)
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }
  const ticket = event.ticketTypes.find((t) => t.key === data.ticketTypeKey)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket type not found' })
  }

  let quote
  try {
    const promos = await listActivePromos()
    quote = computeQuote(
      event,
      ticket,
      {
        eventSlug: data.eventSlug,
        ticketTypeKey: data.ticketTypeKey,
        quantity: data.quantity,
        groupSize: data.groupSize ?? null,
        promoCode: data.promoCode ?? null,
      },
      promos,
    )
  } catch (err) {
    if (err instanceof PricingError) {
      return res.status(err.status).json({ error: err.message })
    }
    throw err
  }

  if (!quote.available) {
    return res.status(409).json({ error: 'Not enough tickets remaining.' })
  }
  if (data.attendees.length !== quote.people) {
    return res
      .status(400)
      .json({ error: 'Provide a name for every attendee in this order.' })
  }

  const gateway = getPaymentGateway()

  try {
    const { booking, accessToken } = await createBooking({
      eventId: event.id,
      userId: req.auth?.sub ?? null,
      ticketTypeKey: data.ticketTypeKey,
      quantity: quote.quantity,
      groupSize: quote.groupSize,
      people: quote.people,
      unitPriceMinor: Math.round(quote.subtotalMinor / quote.quantity),
      subtotalMinor: quote.subtotalMinor,
      discountMinor: quote.discountMinor,
      feeMinor: quote.feeMinor,
      totalMinor: quote.totalMinor,
      currency: quote.currency,
      promoCode: quote.promo?.code ?? null,
      purchaser: data.purchaser,
      attendees: data.attendees,
      paymentProvider: gateway.name,
      idempotencyKey: data.idempotencyKey ?? null,
    })

    const payment = await gateway.start({
      reference: booking.reference,
      amountMinor: booking.totalMinor,
      currency: booking.currency,
      purchaser: data.purchaser,
      description: `${event.name} — ${booking.reference}`,
    })
    if (payment.paymentRef) {
      await setBookingPaymentRef(booking.reference, payment.paymentRef)
    }

    res.status(201).json({ booking, accessToken, payment })
  } catch (err) {
    if (err instanceof BookingError) {
      return res.status(err.status).json({ error: err.message })
    }
    throw err
  }
})

const claimSchema = z.object({
  reference: z.string().min(1).max(40),
  token: z.string().min(1).max(200),
})

/** Booking history for the signed-in user. */
bookingsRouter.get('/bookings', requireAuth, async (req, res) => {
  const bookings = await listUserBookings(req.auth!.sub)
  res.json({ bookings })
})

/** Attach a guest booking to the signed-in account using its access token. */
bookingsRouter.post('/bookings/claim', requireAuth, async (req, res) => {
  const parsed = claimSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid claim request.' })
  }
  const { reference, token } = parsed.data

  const row = await findBookingRow(reference)
  if (!row) {
    return res.status(404).json({ error: 'Booking not found' })
  }
  if (!verifyBookingAccess(row, token)) {
    return res.status(403).json({ error: 'Invalid booking access token.' })
  }

  try {
    await claimBooking(reference, req.auth!.sub)
  } catch (err) {
    if (err instanceof BookingError) {
      return res.status(err.status).json({ error: err.message })
    }
    throw err
  }

  const booking = await getBookingDetail(reference)
  res.json({ booking })
})

/** Fetch a booking using its opaque access token, or as its owner. */
bookingsRouter.get(
  '/bookings/:reference',
  optionalAuth,
  async (req: Request<{ reference: string }>, res) => {
    const reference = req.params.reference
    const token = typeof req.query.token === 'string' ? req.query.token : undefined

    const row = await findBookingRow(reference)
    if (!row) {
      return res.status(404).json({ error: 'Booking not found' })
    }
    const isOwner = Boolean(req.auth?.sub) && row.userId === req.auth?.sub
    if (!isOwner && !verifyBookingAccess(row, token)) {
      return res.status(403).json({ error: 'Invalid booking access token.' })
    }

    const booking = await getBookingDetail(reference)
    res.json({ booking })
  },
)
