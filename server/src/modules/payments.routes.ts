import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import {
  BookingError,
  failBooking,
  findBookingRow,
  fulfillBooking,
  getBookingDetail,
  verifyBookingAccess,
} from '../db/bookings.repo.js'
import { sendBookingConfirmation } from '../notifications/bookingConfirmation.js'

const confirmSchema = z.object({
  reference: z.string().min(3).max(40),
  token: z.string().min(8).max(200),
  outcome: z.enum(['succeed', 'fail']).default('succeed'),
})

export const paymentsRouter = Router()

const confirmLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

/**
 * Mock payment outcome. Only used when PAYMENTS_MODE=mock; lets the client
 * simulate a successful or failed payment without a real provider.
 */
paymentsRouter.post('/payments/mock/confirm', confirmLimiter, async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payment confirmation.' })
  }
  const { reference, token, outcome } = parsed.data

  const row = await findBookingRow(reference)
  if (!row) {
    return res.status(404).json({ error: 'Booking not found' })
  }
  if (!verifyBookingAccess(row, token)) {
    return res.status(403).json({ error: 'Invalid booking access token.' })
  }
  if (row.paymentProvider !== 'mock') {
    return res.status(400).json({ error: 'This booking is not using the mock payment provider.' })
  }

  try {
    if (outcome === 'fail') {
      await failBooking(reference)
      const booking = await getBookingDetail(reference)
      return res.json({ booking, outcome: 'failed' })
    }
    const wasPaid = row.status === 'paid'
    const booking = await fulfillBooking(reference, `mock:${reference}`)
    if (!wasPaid) {
      void sendBookingConfirmation(reference).catch((err) =>
        console.error('[payments] confirmation email failed', err),
      )
    }
    res.json({ booking, outcome: 'paid' })
  } catch (err) {
    if (err instanceof BookingError) {
      return res.status(err.status).json({ error: err.message })
    }
    throw err
  }
})
