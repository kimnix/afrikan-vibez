import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { rateLimit } from 'express-rate-limit'
import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import helmet from 'helmet'
import { assertProductionConfig, env } from './env.js'
import { adminRouter } from './modules/admin.routes.js'
import { authRouter } from './modules/auth.routes.js'
import { bookingsRouter } from './modules/bookings.routes.js'
import { eventsRouter } from './modules/events.routes.js'
import { galleryRouter } from './modules/gallery.routes.js'
import { newsletterRouter } from './modules/newsletter.routes.js'
import { paymentsRouter } from './modules/payments.routes.js'
import { pricingRouter } from './modules/pricing.routes.js'
import { stripeWebhookRouter } from './modules/webhooks.routes.js'
import { ticketsRouter } from './modules/tickets.routes.js'
import { uploadsRouter } from './modules/uploads.routes.js'

const app = express()

assertProductionConfig()

app.disable('x-powered-by')
if (env.trustProxy) app.set('trust proxy', 1)
// Allow the API to serve uploaded media to the client, and lock the document
// policy down to the assets the SPA actually needs (Google Fonts + inline CSS).
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
)
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 600,
  }),
)
// Stripe webhooks need the raw body and uploads need a large body, so both are
// registered before the global JSON parser.
app.use('/api', stripeWebhookRouter)
app.use('/api', uploadsRouter)
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

// Broad, generous ceiling on the whole API as defence in depth. Sensitive
// endpoints (auth, checkout, uploads) carry their own tighter limiters.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
  }),
)

mkdirSync(env.uploadDir, { recursive: true })
app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d', index: false }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'african-vibes-api',
    env: env.nodeEnv,
    paymentsMode: env.paymentsMode,
    database: env.databaseUrl ? 'configured' : 'not-configured',
  })
})

app.use('/api', authRouter)
app.use('/api', eventsRouter)
app.use('/api', galleryRouter)
app.use('/api', pricingRouter)
app.use('/api', bookingsRouter)
app.use('/api', paymentsRouter)
app.use('/api', newsletterRouter)
app.use('/api', ticketsRouter)
app.use('/api', adminRouter)

// Optionally serve the built SPA from the API (single-origin deployment).
if (env.serveClient) {
  const clientDir = resolve(process.cwd(), '../client/dist')
  const indexPath = join(clientDir, 'index.html')
  if (existsSync(indexPath)) {
    app.use(
      express.static(clientDir, {
        index: false,
        maxAge: '1h',
        setHeaders(res, filePath) {
          if (filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      }),
    )
    // SPA fallback for client-side routes (never for API or uploads).
    app.use((req, res, next) => {
      if (
        req.method !== 'GET' ||
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads')
      ) {
        return next()
      }
      res.sendFile(indexPath)
    })
    console.log(`  serving client from ${clientDir}`)
  } else {
    console.warn(
      `[server] SERVE_CLIENT is enabled but ${indexPath} was not found. Run the client build first.`,
    )
  }
}

// API 404 (the SPA is served separately by the client build).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Central error handler.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(env.port, () => {
  console.log(`African Vibes API listening on ${env.baseUrl}`)
  console.log(`  payments mode: ${env.paymentsMode}`)
  console.log(`  client origin: ${env.clientOrigin}`)
})
