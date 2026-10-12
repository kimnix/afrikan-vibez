import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { ApiError, claimBooking, listMyBookings } from '../lib/api'
import { loadBookingAccess } from '../lib/bookingAccess'
import { formatEventTime, formatMoney, formatShortDate } from '../lib/format'
import type { BookingStatus, BookingSummary } from '../types'

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

function isUpcoming(booking: BookingSummary): boolean {
  if (!booking.eventStartAt) return false
  return new Date(booking.eventStartAt).getTime() >= Date.now()
}

export function MyTicketsPage() {
  const { status, accessToken } = useAuth()

  const [bookings, setBookings] = useState<BookingSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    listMyBookings(accessToken)
      .then(setBookings)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not load your bookings.')
      })
      .finally(() => setLoading(false))
  }, [accessToken])

  useEffect(() => {
    load()
  }, [load])

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading tickets"
        />
      </div>
    )
  }

  if (!accessToken) {
    return (
      <>
        <PageHero
          eyebrow="My tickets"
          title="Your digital tickets"
          description="Sign in to see your bookings and scannable QR tickets in one place."
        />
        <Container className="py-12">
          <GlassCard className="p-10 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <Icon name="lock" className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-cream">Sign in to view your tickets</h2>
            <p className="mx-auto mt-3 max-w-xl text-subtle">
              Your upcoming and past events, QR codes and booking references are
              tied to your account.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button to="/account" size="lg">
                Sign in or register
              </Button>
              <Button to="/events" variant="glass" size="lg">
                Browse events
              </Button>
            </div>
          </GlassCard>
        </Container>
      </>
    )
  }

  const upcoming = (bookings ?? []).filter(isUpcoming)
  const past = (bookings ?? []).filter((b) => !isUpcoming(b))
  const hasBookings = (bookings?.length ?? 0) > 0

  return (
    <>
      <PageHero
        eyebrow="My tickets"
        title="Your tickets & bookings"
        description="Every booking you've made, with scannable QR tickets for confirmed orders."
      />

      <Container className="py-12">
        <ClaimPanel accessToken={accessToken} onClaimed={load} />

        {loading && !bookings ? (
          <p className="text-center text-subtle">Loading your bookings…</p>
        ) : error ? (
          <GlassCard className="p-8 text-center">
            <p className="text-red-200">{error}</p>
            <div className="mt-4 flex justify-center">
              <Button variant="glass" onClick={load}>
                Try again
              </Button>
            </div>
          </GlassCard>
        ) : !hasBookings ? (
          <GlassCard className="p-10 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <Icon name="ticket" className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-cream">No bookings yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-subtle">
              Once you complete a booking it will appear here with its QR codes.
              Booked as a guest? Claim it above with your reference and access token.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button to="/events" size="lg">
                Browse events
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-10">
            <BookingSection title="Upcoming" bookings={upcoming} />
            <BookingSection title="Past & other" bookings={past} />
          </div>
        )}
      </Container>
    </>
  )
}

function BookingSection({ title, bookings }: { title: string; bookings: BookingSummary[] }) {
  if (!bookings.length) return null
  return (
    <section>
      <h2 className="mb-4 font-display text-xl font-bold text-cream">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {bookings.map((booking) => (
          <BookingCard key={booking.reference} booking={booking} />
        ))}
      </div>
    </section>
  )
}

function BookingCard({ booking }: { booking: BookingSummary }) {
  return (
    <GlassCard className="flex flex-col p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge tone="gold">{booking.ticketTypeName}</Badge>
          <h3 className="mt-3 font-display text-lg font-bold text-cream">
            {booking.eventName}
          </h3>
          {booking.eventStartAt && (
            <p className="mt-1 flex items-center gap-2 text-sm text-subtle">
              <Icon name="calendar" className="h-4 w-4 shrink-0 text-gold" />
              {formatShortDate(booking.eventStartAt, booking.eventTimezone)} ·{' '}
              {formatEventTime(booking.eventStartAt, booking.eventTimezone)}
            </p>
          )}
          {booking.venueName && (
            <p className="mt-1 flex items-center gap-2 text-sm text-subtle">
              <Icon name="pin" className="h-4 w-4 shrink-0 text-gold" />
              {booking.venueName}
            </p>
          )}
        </div>
        <Badge tone={STATUS_TONE[booking.status]}>{STATUS_LABEL[booking.status]}</Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
        <div>
          <dt className="text-ash">Reference</dt>
          <dd className="font-mono text-cream">{booking.reference}</dd>
        </div>
        <div>
          <dt className="text-ash">Tickets</dt>
          <dd className="text-cream">
            {booking.ticketCount} · {formatMoney(booking.totalMinor, booking.currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <Button to={`/my-tickets/${encodeURIComponent(booking.reference)}`} variant="glass" fullWidth>
          <Icon name="qr" className="h-4 w-4" />
          View tickets
        </Button>
      </div>
    </GlassCard>
  )
}

function ClaimPanel({
  accessToken,
  onClaimed,
}: {
  accessToken: string
  onClaimed: () => void
}) {
  const stored = useMemo(() => loadBookingAccess(), [])
  const [open, setOpen] = useState(Boolean(stored))
  const [reference, setReference] = useState(stored?.reference ?? '')
  const [token, setToken] = useState(stored?.accessToken ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const booking = await claimBooking(
        { reference: reference.trim(), token: token.trim() },
        accessToken,
      )
      setMessage(`Claimed booking ${booking.reference}.`)
      onClaimed()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not claim that booking.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard className="mb-8 p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block font-bold text-cream">Claim a guest booking</span>
          <span className="mt-1 block text-sm text-subtle">
            Booked as a guest? Link it to your account with your reference and access token.
          </span>
        </span>
        <Icon
          name="chevronDown"
          className={`h-5 w-5 shrink-0 text-gold transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <form onSubmit={submit} noValidate className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="claim-ref" className="mb-1.5 block text-sm font-medium text-cream/90">
                Booking reference
              </label>
              <input
                id="claim-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="AV-XXXXXXXX"
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 font-mono text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="claim-token" className="mb-1.5 block text-sm font-medium text-cream/90">
                Access token
              </label>
              <input
                id="claim-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="From your confirmation page"
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 font-mono text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </p>
          )}

          <Button type="submit" disabled={busy || !reference.trim() || !token.trim()}>
            {busy ? 'Claiming…' : 'Claim booking'}
          </Button>
        </form>
      )}
    </GlassCard>
  )
}
