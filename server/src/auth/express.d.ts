import type { AccessTokenPayload } from './tokens.js'

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload
    }
  }
}

export {}
