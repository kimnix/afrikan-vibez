import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBooking } from '../booking/BookingContext'
import { TicketCard } from '../components/tickets/TicketCard'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { ApiError, getBooking } from '../lib/api'
import { loadBookingAccess } from '../lib/bookingAccess'
import { formatMoney } from '../lib/format'
import type { BookingDetail } from '../types'

export function CheckoutConfirmationPage() {
  const [params] = useSearchParams()
  const reference = params.get('ref')
  const access = useMemo(() => loadBookingAccess(), [])
  const { reset } = useBooking()

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The purchase is complete; clear the in-progress booking selection.
  useEffect(() => {
    reset()
  }, [reset])

  useEffect(() => {
    if (!reference || !access) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    getBooking(reference, { bookingToken: access.accessToken }, controller.signal)
      .then((b) => {
        setBooking(b)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load your tickets.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [reference, access])

  return (
    <Container className="py-16">
      {loading ? (
        <p className="text-center text-subtle">Loading your tickets…</p>
      ) : !booking || booking.status !== 'paid' ? (
        <GlassCard className="mx-auto max-w-lg p-8 text-center">
          <Icon name="info" className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold text-cream">
            We couldn't confirm that payment
          </h1>
          <p className="mt-2 text-sm text-subtle">
            {error ?? 'This booking is not available or has not been paid.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button to="/my-tickets" variant="glass">
              My tickets
            </Button>
            <Button to="/tickets">Buy tickets</Button>
          </div>
        </GlassCard>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
              <Icon name="check" className="h-8 w-8 text-emerald-300" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold text-cream">
              You're going to {booking.eventName}!
            </h1>
            <p className="mt-2 text-sm text-subtle">
              A confirmation has been sent to {booking.purchaser.email}.
            </p>
            <div className="mt-4 flex justify-center">
              <Badge tone="success">Paid · {booking.reference}</Badge>
            </div>
          </div>

          <section className="mt-8 space-y-4">
            <h2 className="text-lg font-bold text-cream">Your tickets</h2>
            {booking.tickets.map((ticket, i) => (
              <TicketCard
                key={ticket.id}
                ticket={{ ...ticket, fullName: ticket.fullName || `Attendee ${i + 1}` }}
                reference={booking.reference}
                eventName={booking.eventName}
                eventStartAt={booking.eventStartAt}
                eventTimezone={booking.eventTimezone}
                venueName={booking.venueName}
                ticketTypeName={booking.ticketTypeName}
                index={i}
                total={booking.tickets.length}
              />
            ))}
          </section>

          <GlassCard className="mt-6 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-cream">Order summary</h2>
            <ul className="mt-4 space-y-2 text-sm text-subtle">
              <li className="flex justify-between gap-4">
                <span>
                  {booking.ticketTypeName}
                  {booking.groupSize ? ` · group of ${booking.groupSize}` : ''} ×{' '}
                  {booking.quantity}
                </span>
                <span className="text-cream">
                  {formatMoney(booking.subtotalMinor, booking.currency)}
                </span>
              </li>
              {booking.discountMinor > 0 && (
                <li className="flex justify-between gap-4 text-emerald-300">
                  <span>Discount{booking.promoCode ? ` (${booking.promoCode})` : ''}</span>
                  <span>−{formatMoney(booking.discountMinor, booking.currency)}</span>
                </li>
              )}
              <li className="flex justify-between gap-4">
                <span>Booking fee</span>
                <span className="text-cream">
                  {booking.feeMinor === 0 ? 'Free' : formatMoney(booking.feeMinor, booking.currency)}
                </span>
              </li>
            </ul>
            <div className="mt-4 flex justify-between border-t border-white/10 pt-4">
              <span className="font-semibold text-cream">Total paid</span>
              <span className="gold-text font-display text-2xl font-extrabold">
                {formatMoney(booking.totalMinor, booking.currency)}
              </span>
            </div>
          </GlassCard>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button to="/my-tickets" variant="glass">
              View my tickets
            </Button>
            <Button to="/events">Browse more events</Button>
          </div>
          <p className="mt-4 text-center text-xs text-ash">
            Keep this page or your email — you'll need your ticket codes at the door.
          </p>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-ash">
        <Link to="/contact" className="text-gold hover:underline">
          Need help with your order?
        </Link>
      </p>
    </Container>
  )
}
