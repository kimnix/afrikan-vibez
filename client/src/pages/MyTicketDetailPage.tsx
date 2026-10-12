import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { TicketCard } from '../components/tickets/TicketCard'
import { ApiError, getBooking } from '../lib/api'
import { formatEventDate, formatEventTime, formatMoney } from '../lib/format'
import type { BookingDetail, BookingStatus } from '../types'

const STATUS_TONE: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export function MyTicketDetailPage() {
  const { reference = '' } = useParams()
  const { status, accessToken } = useAuth()

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || !reference) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getBooking(reference, { authToken: accessToken }, controller.signal)
      .then(setBooking)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load this booking.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [reference, accessToken])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading booking"
        />
      </div>
    )
  }

  if (!accessToken) {
    return (
      <Container className="py-16">
        <GlassCard className="mx-auto max-w-lg p-8 text-center">
          <Icon name="lock" className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold text-cream">
            Sign in to view this booking
          </h1>
          <div className="mt-6 flex justify-center gap-3">
            <Button to="/account">Sign in</Button>
            <Button to="/my-tickets" variant="glass">
              My tickets
            </Button>
          </div>
        </GlassCard>
      </Container>
    )
  }

  return (
    <Container className="py-12">
      <Button to="/my-tickets" variant="ghost" size="sm" className="mb-6">
        <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
        All tickets
      </Button>

      {loading ? (
        <p className="text-subtle">Loading your tickets…</p>
      ) : error || !booking ? (
        <GlassCard className="mx-auto max-w-lg p-8 text-center">
          <Icon name="info" className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 font-display text-2xl font-bold text-cream">
            We couldn't find that booking
          </h1>
          <p className="mt-2 text-sm text-subtle">
            {error ?? 'This booking is not available on your account.'}
          </p>
          <div className="mt-6 flex justify-center">
            <Button to="/my-tickets" variant="glass">
              Back to my tickets
            </Button>
          </div>
        </GlassCard>
      ) : (
        <>
          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">
                Booking {booking.reference}
              </p>
              <h1 className="mt-2 font-display text-3xl font-extrabold text-cream sm:text-4xl">
                {booking.eventName}
              </h1>
              {booking.eventStartAt && (
                <p className="mt-2 flex items-center gap-2 text-subtle">
                  <Icon name="calendar" className="h-4 w-4 text-gold" />
                  {formatEventDate(booking.eventStartAt, booking.eventTimezone)} ·{' '}
                  {formatEventTime(booking.eventStartAt, booking.eventTimezone)}
                </p>
              )}
              {booking.venueName && (
                <p className="mt-1 flex items-center gap-2 text-subtle">
                  <Icon name="pin" className="h-4 w-4 text-gold" />
                  {booking.venueName}
                </p>
              )}
            </div>
            <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
          </header>

          <dl className="glass rounded-card mb-8 grid gap-4 p-6 sm:grid-cols-3">
            <Summary label="Ticket type" value={booking.ticketTypeName} />
            <Summary label="Tickets" value={`${booking.quantity}`} />
            <Summary
              label="Total"
              value={formatMoney(booking.totalMinor, booking.currency)}
            />
            <Summary
              label="Attendees"
              value={booking.tickets.map((t) => t.fullName).join(', ') || '—'}
            />
            <Summary label="Purchaser" value={`${booking.purchaser.firstName} ${booking.purchaser.lastName}`} />
            <Summary label="Email" value={booking.purchaser.email} />
          </dl>

          {booking.status === 'paid' ? (
            <section>
              <h2 className="mb-4 font-display text-xl font-bold text-cream">
                Your QR tickets
              </h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {booking.tickets.map((ticket, index) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    reference={booking.reference}
                    eventName={booking.eventName}
                    eventStartAt={booking.eventStartAt}
                    eventTimezone={booking.eventTimezone}
                    venueName={booking.venueName}
                    ticketTypeName={booking.ticketTypeName}
                    index={index}
                    total={booking.tickets.length}
                  />
                ))}
              </div>
            </section>
          ) : (
            <GlassCard className="p-8 text-center">
              <Icon name="info" className="mx-auto h-10 w-10 text-gold" />
              <h2 className="mt-4 font-display text-xl font-bold text-cream">
                Tickets not available
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-subtle">
                {booking.status === 'pending'
                  ? 'This booking is awaiting payment. Your QR tickets appear once payment is confirmed.'
                  : 'This booking is not currently valid. Contact support if you think this is a mistake.'}
              </p>
            </GlassCard>
          )}
        </>
      )}
    </Container>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ash">{label}</dt>
      <dd className="mt-1 text-cream">{value}</dd>
    </div>
  )
}
