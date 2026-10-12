const STORAGE_KEY = 'av.payment.v1'

export interface BookingAccess {
  reference: string
  accessToken: string
}

/**
 * Persist the opaque token that grants access to the in-flight booking. Held in
 * sessionStorage so it survives the redirect to a payment page but not a new
 * browser session.
 */
export function saveBookingAccess(access: BookingAccess): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(access))
  } catch {
    // Ignore storage failures (private mode); redirects still carry the reference.
  }
}

export function loadBookingAccess(): BookingAccess | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BookingAccess>
    if (!parsed.reference || !parsed.accessToken) return null
    return { reference: parsed.reference, accessToken: parsed.accessToken }
  } catch {
    return null
  }
}

export function clearBookingAccess(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore.
  }
}
