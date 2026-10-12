import { getBookingDetail } from '../db/bookings.repo.js'
import { sendEmailInBackground } from './mailer.js'
import { renderBookingConfirmation } from './templates.js'

/**
 * Email the purchaser their tickets after a successful payment. Safe to call
 * more than once, but callers should only trigger it on a real transition to
 * paid so a replayed webhook doesn't send duplicates.
 */
export async function sendBookingConfirmation(reference: string): Promise<void> {
  const booking = await getBookingDetail(reference)
  if (!booking || booking.status !== 'paid') return
  sendEmailInBackground({
    to: booking.purchaser.email,
    ...renderBookingConfirmation(booking),
  })
}
