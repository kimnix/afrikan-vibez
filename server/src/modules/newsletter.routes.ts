import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { createOpaqueToken, hashToken } from '../auth/tokens.js'
import {
  unsubscribeByTokenHash,
  upsertSubscriber,
} from '../db/newsletter.repo.js'
import { DatabaseUnavailableError } from '../db/users.repo.js'
import { env } from '../env.js'
import { sendEmailInBackground } from '../notifications/mailer.js'
import { renderNewsletterWelcome } from '../notifications/templates.js'

const subscribeSchema = z.object({
  email: z.string().trim().email().max(200),
  consent: z.boolean().optional().default(true),
  source: z.string().trim().max(60).optional(),
})

const unsubscribeSchema = z.object({
  token: z.string().min(8).max(200),
})

export const newsletterRouter = Router()

const newsletterLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

function replyIfDbUnavailable(res: import('express').Response, err: unknown): boolean {
  if (err instanceof DatabaseUnavailableError) {
    res.status(503).json({ error: 'Newsletter sign-up is unavailable right now.' })
    return true
  }
  return false
}

newsletterRouter.post('/newsletter/subscribe', newsletterLimiter, async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }
  if (parsed.data.consent === false) {
    return res.status(400).json({ error: 'Please accept the privacy notice to subscribe.' })
  }

  const token = createOpaqueToken()
  try {
    const { created } = await upsertSubscriber({
      email: parsed.data.email,
      source: parsed.data.source ?? 'website',
      unsubscribeTokenHash: token.hash,
    })

    const unsubscribeUrl = `${env.clientOrigin.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(token.raw)}`
    sendEmailInBackground({
      to: parsed.data.email.trim().toLowerCase(),
      ...renderNewsletterWelcome({ unsubscribeUrl }),
    })

    res.status(created ? 201 : 200).json({ ok: true })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

newsletterRouter.post('/newsletter/unsubscribe', newsletterLimiter, async (req, res) => {
  const parsed = unsubscribeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid unsubscribe link.' })
  }
  try {
    const ok = await unsubscribeByTokenHash(hashToken(parsed.data.token))
    if (!ok) {
      return res.status(404).json({ error: 'That unsubscribe link is not valid.' })
    }
    res.json({ ok: true })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})
