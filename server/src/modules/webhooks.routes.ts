import express, { Router } from 'express'
import { BookingError, findBookingRow, fulfillBooking } from '../db/bookings.repo.js'
import { env } from '../env.js'
import { sendBookingConfirmation } from '../notifications/bookingConfirmation.js'
import { isStripeConfigured } from '../payments/gateway.js'

/**
 * Stripe webhook. Registered before `express.json()` so the raw request body is
 * available for signature verification.
 */
export const stripeWebhookRouter = Router()

stripeWebhookRouter.post(
  '/payments/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: 'Stripe is not configured.' })
    }

    const signature = req.headers['stripe-signature']
    if (typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing Stripe signature.' })
    }

    let event: { type: string; data: { object: unknown } }
    try {
      const { default: Stripe } = await import('stripe')
      const stripe = new Stripe(env.stripeSecretKey)
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        signature,
        env.stripeWebhookSecret,
      ) as unknown as { type: string; data: { object: unknown } }
    } catch (err) {
      console.error('[payments] Invalid Stripe webhook signature', err)
      return res.status(400).json({ error: 'Invalid signature.' })
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as {
        id: string
        metadata?: Record<string, string> | null
      }
      const reference = session.metadata?.bookingReference
      if (reference) {
        try {
          const before = await findBookingRow(reference)
          await fulfillBooking(reference, session.id)
          if (before && before.status !== 'paid') {
            void sendBookingConfirmation(reference).catch((err) =>
              console.error('[payments] confirmation email failed', err),
            )
          }
        } catch (err) {
          if (err instanceof BookingError) {
            console.warn(`[payments] Fulfilment for ${reference} failed: ${err.message}`)
          } else {
            console.error('[payments] Fulfilment error', err)
          }
        }
      }
    }

    res.json({ received: true })
  },
)
