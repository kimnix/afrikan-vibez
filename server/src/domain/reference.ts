import { createHash, randomBytes } from 'node:crypto'

/** Alphabet without ambiguous characters (no O/0, I/1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** A short, unguessable, human-readable booking reference, e.g. `AV-7F3K9Q2M`. */
export function generateReference(): string {
  const bytes = randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return `AV-${out}`
}

/** Opaque code embedded in an attendee's QR ticket. */
export function generateTicketCode(): string {
  return randomBytes(16).toString('base64url')
}

/**
 * Opaque token that grants access to a single booking. The raw value is given
 * to the client; only its SHA-256 hash is stored.
 */
export function generateAccessToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url')
  return { raw, hash: sha256(raw) }
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
