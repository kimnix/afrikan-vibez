import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from './tokens.js'

/**
 * Require a valid `Authorization: Bearer <access token>` header. On success the
 * decoded payload is attached to `req.auth`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }
  try {
    req.auth = verifyAccessToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
}

/**
 * Attach `req.auth` when a valid access token is supplied, but never reject.
 * Lets authenticated users be associated with a booking while still allowing
 * guest checkout.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      req.auth = verifyAccessToken(token)
    } catch {
      // Ignore invalid tokens for optional auth.
    }
  }
  next()
}

/** Require an authenticated user whose role is one of `roles`. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required.' })
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' })
    }
    next()
  }
}
