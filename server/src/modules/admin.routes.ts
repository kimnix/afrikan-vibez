import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth/middleware.js'
import {
  createEvent,
  createTicketType,
  getAdminBooking,
  getAdminStats,
  listAdminBookings,
  listAllPromos,
  updateBookingStatus,
  updateEvent,
  updateTicketType,
  upsertPromo,
} from '../db/admin.repo.js'
import { BookingError } from '../db/bookings.repo.js'
import { getEventById, listEvents } from '../db/events.repo.js'
import {
  createGalleryItem,
  deleteGalleryItem,
  listAllGallery,
  updateGalleryItem,
} from '../db/gallery.repo.js'
import { listSubscribers, listSubscribersForExport } from '../db/newsletter.repo.js'
import {
  getEventPerformance,
  getSalesReport,
  getTicketTypeBreakdown,
  listBookingsForExport,
} from '../db/reports.repo.js'
import { toCsv } from '../lib/csv.js'

const venueSchema = z.object({
  name: z.string().min(1).max(160),
  addressLine: z.string().min(1).max(200),
  city: z.string().min(1).max(120),
  country: z.string().min(1).max(120),
  mapUrl: z.string().url().max(500).optional(),
})

const feesSchema = z.object({
  bookingFeePercent: z.number().min(0).max(100),
  note: z.string().max(400),
})

const datetime = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date and time.')

const eventSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes only.'),
  name: z.string().min(1).max(160),
  tagline: z.string().max(200),
  headline: z.string().max(200),
  summary: z.string().max(600),
  description: z.string().max(4000),
  startAt: datetime,
  endAt: datetime,
  timezone: z.string().min(1).max(60),
  currency: z.string().min(3).max(3),
  status: z.enum(['draft', 'scheduled', 'on_sale', 'sold_out', 'ended', 'cancelled']),
  venue: venueSchema,
  heroImageUrl: z.string().url().max(500).nullable().optional(),
  fees: feesSchema,
  featured: z.boolean().optional(),
})

const ticketTypeSchema = z.object({
  key: z.enum(['standard', 'group', 'vip', 'exclusive']),
  name: z.string().min(1).max(120),
  tagline: z.string().max(160),
  priceMinor: z.number().int().min(0),
  includesPeople: z.number().int().min(1).max(100),
  benefits: z.array(z.string().max(200)).max(20).optional(),
  groupSizes: z.array(z.number().int().min(2).max(100)).max(20).nullable().optional(),
  groupPricing: z
    .array(
      z.object({
        size: z.number().int().min(2).max(100),
        totalMinor: z.number().int().min(0),
      }),
    )
    .max(20)
    .nullable()
    .optional(),
  capacity: z.number().int().min(0),
  remaining: z.number().int().min(0).optional(),
  onSale: z.boolean().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

const promoSchema = z.object({
  code: z.string().min(2).max(40),
  kind: z.enum(['percent', 'amount']),
  value: z.number().int().min(1),
  label: z.string().min(1).max(120),
  active: z.boolean(),
  minSubtotalMinor: z.number().int().min(0).nullable().optional(),
  maxDiscountMinor: z.number().int().min(0).nullable().optional(),
})

const bookingQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'failed', 'cancelled', 'refunded']).optional(),
  eventId: z.string().max(200).optional(),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const bookingStatusSchema = z.object({
  status: z.enum(['refunded', 'cancelled']),
})

async function respond<T>(
  res: Response,
  run: () => Promise<T>,
  status = 200,
): Promise<void> {
  try {
    const data = await run()
    res.status(status).json(data)
  } catch (err) {
    if (err instanceof BookingError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    throw err
  }
}

export const adminRouter = Router()

// Every admin route requires a signed-in user with the admin role. Scoped to
// the /admin prefix so unknown API paths still reach the API 404 handler.
adminRouter.use('/admin', requireAuth, requireRole('admin'))

adminRouter.get('/admin/stats', async (_req, res) => {
  await respond(res, () => getAdminStats())
})

adminRouter.get('/admin/events', async (_req, res) => {
  await respond(res, async () => ({ events: await listEvents() }))
})

adminRouter.get('/admin/events/:id', async (req: Request<{ id: string }>, res) => {
  await respond(res, async () => {
    const event = await getEventById(req.params.id)
    if (!event) throw new BookingError(404, 'Event not found.')
    return { event }
  })
})

adminRouter.post('/admin/events', async (req, res) => {
  const parsed = eventSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid event details.', issues: parsed.error.issues })
    return
  }
  await respond(res, async () => ({ event: await createEvent(parsed.data) }), 201)
})

adminRouter.patch('/admin/events/:id', async (req: Request<{ id: string }>, res) => {
  const parsed = eventSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid event details.', issues: parsed.error.issues })
    return
  }
  await respond(res, async () => ({ event: await updateEvent(req.params.id, parsed.data) }))
})

adminRouter.post('/admin/events/:id/ticket-types', async (req: Request<{ id: string }>, res) => {
  const parsed = ticketTypeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid ticket type.', issues: parsed.error.issues })
    return
  }
  await respond(
    res,
    async () => ({ event: await createTicketType(req.params.id, parsed.data) }),
    201,
  )
})

adminRouter.patch('/admin/ticket-types/:id', async (req: Request<{ id: string }>, res) => {
  const parsed = ticketTypeSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid ticket type.', issues: parsed.error.issues })
    return
  }
  await respond(res, async () => ({ event: await updateTicketType(req.params.id, parsed.data) }))
})

adminRouter.get('/admin/bookings', async (req, res) => {
  const parsed = bookingQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid filters.' })
    return
  }
  const { status, eventId, q, limit, offset } = parsed.data
  await respond(res, () =>
    listAdminBookings({ status, eventId, search: q, limit, offset }),
  )
})

adminRouter.get('/admin/bookings/:reference', async (req: Request<{ reference: string }>, res) => {
  await respond(res, async () => ({ booking: await getAdminBooking(req.params.reference) }))
})

adminRouter.post(
  '/admin/bookings/:reference/status',
  async (req: Request<{ reference: string }>, res) => {
    const parsed = bookingStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid status.' })
      return
    }
    await respond(res, async () => ({
      booking: await updateBookingStatus(req.params.reference, parsed.data.status),
    }))
  },
)

adminRouter.get('/admin/promos', async (_req, res) => {
  await respond(res, async () => ({ promos: await listAllPromos() }))
})

adminRouter.post('/admin/promos', async (req, res) => {
  const parsed = promoSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid promo.', issues: parsed.error.issues })
    return
  }
  await respond(res, async () => ({ promo: await upsertPromo(parsed.data) }), 201)
})

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

const gallerySchema = z.object({
  title: z.string().min(1).max(160),
  caption: z.string().max(400).optional(),
  imageUrl: z.string().url().max(1000),
  alt: z.string().max(200).optional(),
  eventId: z.string().max(200).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
})

adminRouter.get('/admin/gallery', async (_req, res) => {
  await respond(res, async () => ({ items: await listAllGallery() }))
})

adminRouter.post('/admin/gallery', async (req, res) => {
  const parsed = gallerySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid gallery item.', issues: parsed.error.issues })
    return
  }
  await respond(res, async () => ({ item: await createGalleryItem(parsed.data) }), 201)
})

adminRouter.patch('/admin/gallery/:id', async (req: Request<{ id: string }>, res) => {
  const parsed = gallerySchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid gallery item.', issues: parsed.error.issues })
    return
  }
  await respond(res, async () => ({ item: await updateGalleryItem(req.params.id, parsed.data) }))
})

adminRouter.delete('/admin/gallery/:id', async (req: Request<{ id: string }>, res) => {
  await respond(res, async () => {
    await deleteGalleryItem(req.params.id)
    return { ok: true }
  })
})

// ---------------------------------------------------------------------------
// Newsletter subscribers
// ---------------------------------------------------------------------------

adminRouter.get('/admin/subscribers', async (req, res) => {
  const raw = req.query.status
  const status = raw === 'subscribed' || raw === 'unsubscribed' ? raw : undefined
  const limit = Number(req.query.limit ?? 50)
  const offset = Number(req.query.offset ?? 0)
  await respond(res, () =>
    listSubscribers({
      status,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    }),
  )
})

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

adminRouter.get('/admin/reports/sales', async (req, res) => {
  const parsed = Number(req.query.days ?? 30)
  await respond(res, async () => ({
    sales: await getSalesReport(Number.isFinite(parsed) ? parsed : 30),
  }))
})

adminRouter.get('/admin/reports/events', async (_req, res) => {
  await respond(res, async () => ({ events: await getEventPerformance() }))
})

adminRouter.get('/admin/reports/ticket-types', async (_req, res) => {
  await respond(res, async () => ({ ticketTypes: await getTicketTypeBreakdown() }))
})

function csvResponse(res: Response, csv: string, filename: string): void {
  const stamp = new Date().toISOString().slice(0, 10)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}-${stamp}.csv"`)
  res.status(200).send(csv)
}

adminRouter.get('/admin/reports/bookings.csv', async (_req, res) => {
  const rows = await listBookingsForExport()
  csvResponse(res, toCsv(rows as unknown as Record<string, unknown>[]), 'bookings')
})

adminRouter.get('/admin/reports/subscribers.csv', async (_req, res) => {
  const rows = await listSubscribersForExport()
  const csv = toCsv(
    rows.map((row) => ({
      email: row.email,
      firstName: row.firstName ?? '',
      status: row.status,
      source: row.source ?? '',
      subscribedAt: row.confirmedAt ? row.confirmedAt.toISOString() : row.createdAt.toISOString(),
      unsubscribedAt: row.unsubscribedAt ? row.unsubscribedAt.toISOString() : '',
    })),
  )
  csvResponse(res, csv, 'subscribers')
})
