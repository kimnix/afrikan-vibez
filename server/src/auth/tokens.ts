import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../env.js'

export interface AccessTokenPayload {
  /** User id. */
  sub: string
  role: string
}

/**
 * Sign a short-lived access token. Access tokens are held in the browser and
 * sent as `Authorization: Bearer …`; they are never stored server-side.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwtAccessSecret)
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Invalid access token payload')
  }
  return { sub: String(decoded.sub), role: String(decoded.role ?? 'customer') }
}

/**
 * Create an opaque refresh token. The raw value is returned to the caller (and
 * set as an httpOnly cookie); only its SHA-256 hash is persisted, so a database
 * leak cannot be used to mint sessions.
 */
export function createRefreshToken(): { raw: string; hash: string } {
  return createOpaqueToken()
}

export function hashRefreshToken(raw: string): string {
  return hashToken(raw)
}

/**
 * Create a generic opaque, URL-safe token. Used for refresh tokens, email
 * verification links and password reset links; only the hash is ever stored.
 */
export function createOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(48).toString('base64url')
  return { raw, hash: hashToken(raw) }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function refreshTokenExpiry(): Date {
  const ms = env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  return new Date(Date.now() + ms)
}
