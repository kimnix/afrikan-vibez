import type { Request, Response } from 'express'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../env.js'
import type { UserRow } from '../db/schema.js'
import {
  createUser,
  DatabaseUnavailableError,
  findActiveRefreshToken,
  findUserByEmail,
  findUserById,
  markEmailVerified,
  revokeRefreshToken,
  revokeTokensForUser,
  storeRefreshToken,
  updatePasswordHash,
} from '../db/users.repo.js'
import {
  consumeAuthToken,
  createAuthToken,
  findValidAuthToken,
  invalidateAuthTokens,
} from '../db/authTokens.repo.js'
import { requireAuth } from '../auth/middleware.js'
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '../auth/passwords.js'
import {
  createOpaqueToken,
  createRefreshToken,
  hashRefreshToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
} from '../auth/tokens.js'
import { sendEmailInBackground } from '../notifications/mailer.js'
import {
  renderPasswordReset,
  renderVerifyEmail,
} from '../notifications/templates.js'

const REFRESH_COOKIE = 'av_refresh'
const REFRESH_COOKIE_PATH = '/api/auth'

// A fixed bcrypt hash so a login attempt for an unknown email still performs a
// password comparison, preventing account enumeration via response timing.
let dummyHashPromise: Promise<string> | null = null
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword('african-vibes-dummy-password')
  return dummyHashPromise
}

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
  phone: z.string().trim().max(40).optional(),
  marketingOptIn: z.boolean().optional().default(false),
})

const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
})

function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    marketingOptIn: user.marketingOptIn,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt.toISOString(),
  }
}

function setRefreshCookie(res: Response, raw: string, expires: Date) {
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: REFRESH_COOKIE_PATH,
    expires,
  })
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: REFRESH_COOKIE_PATH,
  })
}

/** Create a refresh token + cookie and return a fresh access token. */
async function issueSession(
  res: Response,
  req: Request,
  user: UserRow,
): Promise<string> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role })
  const { raw, hash } = createRefreshToken()
  const expiresAt = refreshTokenExpiry()
  await storeRefreshToken({
    userId: user.id,
    tokenHash: hash,
    expiresAt,
    userAgent: req.headers['user-agent']?.slice(0, 300) ?? null,
    ip: req.ip ?? null,
  })
  setRefreshCookie(res, raw, expiresAt)
  return accessToken
}

function replyIfDbUnavailable(res: Response, err: unknown): boolean {
  if (err instanceof DatabaseUnavailableError) {
    res.status(503).json({ error: 'Accounts are unavailable right now.' })
    return true
  }
  return false
}

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

function clientUrl(path: string): string {
  return `${env.clientOrigin.replace(/\/$/, '')}${path}`
}

/** Issue a fresh email-verification token and email the confirmation link. */
async function sendVerificationEmail(user: UserRow): Promise<void> {
  const token = createOpaqueToken()
  await invalidateAuthTokens(user.id, 'email_verify')
  await createAuthToken({
    userId: user.id,
    kind: 'email_verify',
    tokenHash: token.hash,
    expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
  })
  sendEmailInBackground({
    to: user.email,
    ...renderVerifyEmail({
      firstName: user.firstName,
      url: clientUrl(`/verify-email?token=${encodeURIComponent(token.raw)}`),
    }),
  })
}

export const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
})

authRouter.post('/auth/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please check the details you entered.' })
  }

  try {
    const existing = await findUserByEmail(parsed.data.email)
    if (existing) {
      return res
        .status(409)
        .json({ error: 'An account with that email already exists.' })
    }

    const user = await createUser({
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      marketingOptIn: parsed.data.marketingOptIn,
    })

    const accessToken = await issueSession(res, req, user)
    void sendVerificationEmail(user).catch((err) =>
      console.error('[auth] Failed to send verification email:', err),
    )
    res.status(201).json({ user: publicUser(user), accessToken })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

authRouter.post('/auth/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter your email and password.' })
  }

  try {
    const user = await findUserByEmail(parsed.data.email)
    const ok = await verifyPassword(
      parsed.data.password,
      user?.passwordHash ?? (await dummyHash()),
    )
    if (!user || !ok) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }

    const accessToken = await issueSession(res, req, user)
    res.json({ user: publicUser(user), accessToken })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

authRouter.post('/auth/refresh', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE]
  if (typeof raw !== 'string' || raw.length === 0) {
    return res.status(401).json({ error: 'No active session.' })
  }

  try {
    const token = await findActiveRefreshToken(hashRefreshToken(raw))
    if (!token || token.expiresAt.getTime() < Date.now()) {
      if (token) await revokeRefreshToken(token.id)
      clearRefreshCookie(res)
      return res
        .status(401)
        .json({ error: 'Your session has expired. Please sign in again.' })
    }

    const user = await findUserById(token.userId)
    if (!user) {
      await revokeRefreshToken(token.id)
      clearRefreshCookie(res)
      return res.status(401).json({ error: 'Account not found.' })
    }

    // Rotate: revoke the used token before issuing a replacement.
    await revokeRefreshToken(token.id)
    const accessToken = await issueSession(res, req, user)
    res.json({ user: publicUser(user), accessToken })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

authRouter.post('/auth/logout', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE]
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const token = await findActiveRefreshToken(hashRefreshToken(raw))
      if (token) await revokeRefreshToken(token.id)
    } catch {
      // Even if revocation fails, clear the cookie so the client is signed out.
    }
  }
  clearRefreshCookie(res)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Email verification & password reset
// ---------------------------------------------------------------------------

const tokenSchema = z.object({ token: z.string().min(8).max(200) })

authRouter.post('/auth/verify-email', authLimiter, async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid verification link.' })
  }
  try {
    const token = await findValidAuthToken('email_verify', hashToken(parsed.data.token))
    if (!token) {
      return res
        .status(400)
        .json({ error: 'This verification link is invalid or has expired.' })
    }
    await markEmailVerified(token.userId)
    await consumeAuthToken(token.id)
    res.json({ ok: true })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

authRouter.post('/auth/resend-verification', authLimiter, requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.auth!.sub)
    if (!user) {
      return res.status(401).json({ error: 'Account not found.' })
    }
    if (user.emailVerifiedAt) {
      return res.json({ ok: true, alreadyVerified: true })
    }
    await sendVerificationEmail(user)
    res.json({ ok: true })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

const forgotSchema = z.object({ email: z.string().trim().email().max(200) })

authRouter.post('/auth/forgot-password', authLimiter, async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }
  try {
    const user = await findUserByEmail(parsed.data.email)
    if (user) {
      const token = createOpaqueToken()
      await invalidateAuthTokens(user.id, 'password_reset')
      await createAuthToken({
        userId: user.id,
        kind: 'password_reset',
        tokenHash: token.hash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      })
      sendEmailInBackground({
        to: user.email,
        ...renderPasswordReset({
          firstName: user.firstName,
          url: clientUrl(`/reset-password?token=${encodeURIComponent(token.raw)}`),
        }),
      })
    }
    // Always respond the same so the endpoint can't be used to enumerate accounts.
    res.json({ ok: true })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

const resetSchema = z.object({
  token: z.string().min(8).max(200),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
})

authRouter.post('/auth/reset-password', authLimiter, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: `Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`,
    })
  }
  try {
    const token = await findValidAuthToken('password_reset', hashToken(parsed.data.token))
    if (!token) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' })
    }
    await updatePasswordHash(token.userId, await hashPassword(parsed.data.password))
    await revokeTokensForUser(token.userId)
    await consumeAuthToken(token.id)
    res.json({ ok: true })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})

authRouter.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await findUserById(req.auth!.sub)
    if (!user) {
      return res.status(401).json({ error: 'Account not found.' })
    }
    res.json({ user: publicUser(user) })
  } catch (err) {
    if (replyIfDbUnavailable(res, err)) return
    throw err
  }
})
