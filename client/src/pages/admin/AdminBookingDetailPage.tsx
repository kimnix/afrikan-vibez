import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import { Icon } from '../../components/ui/Icon'
import { ApiError, getAdminBooking, updateAdminBookingStatus } from '../../lib/api'
import { formatEventDate, formatMoney } from '../../lib/format'
import type { BookingDetail, BookingStatus } from '../../types'

const STATUS_TONE: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
}

export function AdminBookingDetailPage() {
  const { reference = '' } = useParams()
  const { accessToken } = useAuth()

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || !reference) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getAdminBooking(reference, accessToken, controller.signal)
      .then(setBooking)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load the booking.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [reference, accessToken])

  async function setStatus(status: 'refunded' | 'cancelled') {
    if (!accessToken || !booking) return
    if (!window.confirm(`Mark booking ${booking.reference} as ${status}?`)) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await updateAdminBookingStatus(booking.reference, status, accessToken)
      setBooking(updated)
      setMessage(`Booking marked as ${status}.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the booking.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-subtle">Loading booking…</p>

  if (error && !booking) return <p className="text-red-200">{error}</p>
  if (!booking) return <p className="text-subtle">Booking not found.</p>

  const checkedIn = booking.tickets.filter((t) => t.checkedInAt).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button to="/admin/bookings" variant="ghost" size="sm" className="mb-2">
            <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
            All bookings
          </Button>
          <h2 className="font-display text-2xl font-bold text-cream">{booking.eventName}</h2>
          <p className="font-mono text-sm text-subtle">{booking.reference}</p>
        </div>
        <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <dl className="glass rounded-card grid gap-4 p-6 sm:grid-cols-3">
        <Item label="Purchaser" value={`${booking.purchaser.firstName} ${booking.purchaser.lastName}`} />
        <Item label="Email" value={booking.purchaser.email} />
        <Item label="Phone" value={booking.purchaser.phone ?? '—'} />
        <Item label="Ticket type" value={booking.ticketTypeName} />
        <Item label="Tickets" value={`${booking.quantity} (${booking.people} people)`} />
        <Item label="Total" value={formatMoney(booking.totalMinor, booking.currency)} />
        <Item label="Event date" value={formatEventDate(booking.eventStartAt, booking.eventTimezone)} />
        <Item label="Checked in" value={`${checkedIn} / ${booking.tickets.length}`} />
        <Item label="Provider" value={booking.paymentProvider} />
      </dl>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-ash">
              <tr>
                <th className="px-5 py-3 font-semibold">Attendee</th>
                <th className="px-5 py-3 font-semibold">Ticket code</th>
                <th className="px-5 py-3 font-semibold">Checked in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {booking.tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-5 py-3 text-cream">{ticket.fullName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-subtle">{ticket.ticketCode}</td>
                  <td className="px-5 py-3">
                    {ticket.checkedInAt ? (
                      <Badge tone="success">yes</Badge>
                    ) : (
                      <Badge tone="neutral">no</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {(booking.status === 'paid' || booking.status === 'pending') && (
        <div className="flex flex-wrap gap-3">
          <Button variant="danger" disabled={busy} onClick={() => setStatus('refunded')}>
            Mark refunded
          </Button>
          <Button variant="glass" disabled={busy} onClick={() => setStatus('cancelled')}>
            Cancel booking
          </Button>
        </div>
      )}
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ash">{label}</dt>
      <dd className="mt-1 text-cream">{value}</dd>
    </div>
  )
}
