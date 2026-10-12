import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { getEventBySlug, listActivePromos } from '../db/events.repo.js'
import { computeQuote, PricingError } from '../domain/pricing.js'

const quoteSchema = z.object({
  eventSlug: z.string().min(1).max(200),
  ticketTypeKey: z.enum(['standard', 'group', 'vip', 'exclusive']),
  quantity: z.number().int().min(1).max(10),
  groupSize: z.number().int().positive().nullable().optional(),
  promoCode: z.string().max(40).nullable().optional(),
})

export const pricingRouter = Router()

const quoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

pricingRouter.post('/quote', quoteLimiter, async (req, res) => {
  const parsed = quoteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid quote request.' })
  }

  const event = await getEventBySlug(parsed.data.eventSlug)
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }

  const ticket = event.ticketTypes.find((t) => t.key === parsed.data.ticketTypeKey)
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket type not found' })
  }

  try {
    const promos = await listActivePromos()
    const quote = computeQuote(event, ticket, parsed.data, promos)
    res.json(quote)
  } catch (err) {
    if (err instanceof PricingError) {
      return res.status(err.status).json({ error: err.message })
    }
    throw err
  }
})
