import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
// Load the repo-root .env whether the server runs from ./server or the root.
for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate })
    break
  }
}

function optional(key: string, fallback: string): string {
  return process.env[key] && process.env[key]!.length > 0
    ? process.env[key]!
    : fallback
}

const nodeEnv = optional('NODE_ENV', 'development')
const isProd = nodeEnv === 'production'

// Render injects the service's public URL; use it as the default public origin
// so a single-origin deploy needs no manual BASE_URL/CLIENT_ORIGIN wiring.
const renderExternalUrl = (process.env.RENDER_EXTERNAL_URL ?? '').replace(/\/$/, '')

function bool(key: string, fallback: boolean): boolean {
  const raw = optional(key, fallback ? 'true' : 'false').toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
}

export const env = {
  nodeEnv,
  isProd,
  port: Number(optional('PORT', '4000')),
  baseUrl: optional('BASE_URL', renderExternalUrl || 'http://localhost:4000'),
  clientOrigin: optional('CLIENT_ORIGIN', renderExternalUrl || 'http://localhost:5173'),
  /** Trust the first proxy hop (set when running behind nginx/Heroku/etc.). */
  trustProxy: bool('TRUST_PROXY', isProd),
  /** Serve the built SPA from the API (defaults on in production). */
  serveClient: bool('SERVE_CLIENT', isProd),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtAccessSecret: optional('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: optional('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  accessTokenTtl: optional('ACCESS_TOKEN_TTL', '15m'),
  refreshTokenTtlDays: Number(optional('REFRESH_TOKEN_TTL_DAYS', '30')),
  paymentsMode: (optional('PAYMENTS_MODE', 'mock') as 'mock' | 'stripe'),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  defaultCurrency: optional('DEFAULT_CURRENCY', 'gbp'),
  defaultTimezone: optional('DEFAULT_TIMEZONE', 'Europe/London'),
  emailFrom: optional('EMAIL_FROM', 'African Vibes <tickets@example.com>'),
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  uploadDir: resolve(process.cwd(), optional('UPLOAD_DIR', 'uploads')),
}

/**
 * Refuse to boot in production when critical configuration is missing or still
 * set to development defaults. This turns dangerous misconfigurations (default
 * JWT secrets, no database, localhost origins) into a loud failure instead of a
 * silently insecure deployment.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true

  try {
    const url = new URL(origin)
    const host = url.hostname
    const configured = new URL(env.clientOrigin)

    if (origin === env.clientOrigin) return true
    if (url.origin === configured.origin) return true

    if (!env.isProd) {
      const localhostHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])
      if (localhostHosts.has(host)) return true
    }

    return false
  } catch {
    return false
  }
}

export function assertProductionConfig(): void {
  if (!env.isProd) return
  const problems: string[] = []

  if (!env.databaseUrl) problems.push('DATABASE_URL must be set.')
  if (env.jwtAccessSecret.startsWith('dev-') || env.jwtAccessSecret.length < 32) {
    problems.push('JWT_ACCESS_SECRET must be a unique secret of at least 32 characters.')
  }
  if (env.jwtRefreshSecret.startsWith('dev-') || env.jwtRefreshSecret.length < 32) {
    problems.push('JWT_REFRESH_SECRET must be a unique secret of at least 32 characters.')
  }
  if (env.jwtAccessSecret === env.jwtRefreshSecret) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.')
  }
  if (env.clientOrigin.includes('localhost')) {
    problems.push('CLIENT_ORIGIN must be the public site origin, not localhost.')
  }
  if (env.baseUrl.includes('localhost')) {
    problems.push('BASE_URL must be the public API origin, not localhost.')
  }
  if (env.paymentsMode === 'stripe') {
    if (!env.stripeSecretKey) problems.push('STRIPE_SECRET_KEY is required when PAYMENTS_MODE=stripe.')
    if (!env.stripeWebhookSecret) {
      problems.push('STRIPE_WEBHOOK_SECRET is required when PAYMENTS_MODE=stripe.')
    }
  }

  if (problems.length > 0) {
    console.error('[env] Refusing to start: unsafe production configuration.')
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
}

export type Env = typeof env
