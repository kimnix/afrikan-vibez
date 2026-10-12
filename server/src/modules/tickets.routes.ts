import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth/middleware.js'
import { isDbConfigured } from '../db/client.js'
import { checkInTicket, validateTicket } from '../db/tickets.repo.js'

const codeSchema = z.object({
  code: z.string().trim().min(6).max(300),
})

/**
 * Accept either a raw ticket code or a scanned URL that carries one (e.g.
 * `https://…/ticket?code=abc`), so QR payloads can be human-friendly.
 */
function normaliseCode(value: string): string {
  const match = /(?:^|[?&])code=([^&\s]+)/.exec(value)
  return match ? decodeURIComponent(match[1]!) : value.trim()
}

export const ticketsRouter = Router()

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

/** Look up a ticket without checking it in — used to preview a scan. */
ticketsRouter.post(
  '/tickets/validate',
  scanLimiter,
  requireAuth,
  requireRole('admin', 'staff'),
  async (req, res) => {
    const parsed = codeSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Scan or enter a valid ticket code.' })
    }
    if (!isDbConfigured()) {
      return res.status(503).json({ error: 'Ticket scanning is unavailable right now.' })
    }
    const result = await validateTicket(normaliseCode(parsed.data.code))
    res.json(result)
  },
)

/** Check a ticket in (idempotent — a repeat scan is reported, not re-applied). */
ticketsRouter.post(
  '/tickets/check-in',
  scanLimiter,
  requireAuth,
  requireRole('admin', 'staff'),
  async (req, res) => {
    const parsed = codeSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Scan or enter a valid ticket code.' })
    }
    if (!isDbConfigured()) {
      return res.status(503).json({ error: 'Ticket scanning is unavailable right now.' })
    }
    const result = await checkInTicket(normaliseCode(parsed.data.code))
    res.json(result)
  },
)
