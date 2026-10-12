import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import { ApiError, listAdminBookings, listAdminEvents } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import type {
  AdminBookingListResult,
  BookingStatus,
  EventDetail,
} from '../../types'

const STATUSES: BookingStatus[] = ['pending', 'paid', 'failed', 'refunded', 'cancelled']

const STATUS_TONE: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
}

const PAGE_SIZE = 25

export function AdminBookingsPage() {
  const { accessToken } = useAuth()

  const [status, setStatus] = useState('')
  const [eventId, setEventId] = useState('')
  const [search, setSearch] = useState('')

  const [applied, setApplied] = useState({ status: '', eventId: '', search: '' })
  const [offset, setOffset] = useState(0)

  const [data, setData] = useState<AdminBookingListResult | null>(null)
  const [events, setEvents] = useState<EventDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    listAdminEvents(accessToken, controller.signal)
      .then(setEvents)
      .catch(() => undefined)
    return () => controller.abort()
  }, [accessToken])

  const load = useCallback(() => {
    if (!accessToken) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    listAdminBookings(
      {
        status: applied.status || undefined,
        eventId: applied.eventId || undefined,
        q: applied.search || undefined,
        limit: PAGE_SIZE,
        offset,
      },
      accessToken,
      controller.signal,
    )
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load bookings.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [accessToken, applied, offset])

  useEffect(() => {
    const cleanup = load()
    return cleanup
  }, [load])

  function applyFilters(e: FormEvent) {
    e.preventDefault()
    setOffset(0)
    setApplied({ status, eventId, search })
  }

  function resetFilters() {
    setStatus('')
    setEventId('')
    setSearch('')
    setOffset(0)
    setApplied({ status: '', eventId: '', search: '' })
  }

  const total = data?.total ?? 0
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-cream">Bookings</h2>

      <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, name or email"
          className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
        >
          <option value="" className="bg-ink">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-ink">
              {s}
            </option>
          ))}
        </select>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
        >
          <option value="" className="bg-ink">All events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id} className="bg-ink">
              {event.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Filter
          </Button>
          <Button type="button" variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {error ? (
        <p className="text-red-200">{error}</p>
      ) : loading && !data ? (
        <p className="text-subtle">Loading bookings…</p>
      ) : !data || data.bookings.length === 0 ? (
        <GlassCard className="p-8 text-center text-subtle">No bookings match your filters.</GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <th className="px-5 py-3 font-semibold">Reference</th>
                  <th className="px-5 py-3 font-semibold">Purchaser</th>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-5 py-3 font-semibold">Tickets</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.bookings.map((booking) => (
                  <tr key={booking.reference} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4 font-mono text-cream">{booking.reference}</td>
                    <td className="px-5 py-4">
                      <p className="text-cream">{booking.purchaserName || '—'}</p>
                      <p className="text-xs text-subtle">{booking.purchaserEmail}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-cream">{booking.eventName}</p>
                      <p className="text-xs text-subtle">{booking.createdAt.slice(0, 10)}</p>
                    </td>
                    <td className="px-5 py-4 text-subtle">{booking.people}</td>
                    <td className="px-5 py-4 text-cream">
                      {formatMoney(booking.totalMinor, booking.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/admin/bookings/${encodeURIComponent(booking.reference)}`}
                        className="font-semibold text-gold hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <div className="flex items-center justify-between gap-4 text-sm text-subtle">
        <span>
          {total === 0 ? 'No results' : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <Button
            variant="glass"
            size="sm"
            disabled={!canPrev}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="glass"
            size="sm"
            disabled={!canNext}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
