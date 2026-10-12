import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import { Icon } from '../../components/ui/Icon'
import { ApiError, getAdminStats, listAdminBookings } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import type { AdminBookingListItem, AdminStats, BookingStatus } from '../../types'

const STATUS_TONE: Record<BookingStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
}

export function AdminDashboardPage() {
  const { accessToken } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recent, setRecent] = useState<AdminBookingListItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    Promise.all([
      getAdminStats(accessToken, controller.signal),
      listAdminBookings({ limit: 6 }, accessToken, controller.signal),
    ])
      .then(([s, b]) => {
        setStats(s)
        setRecent(b.bookings)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load dashboard data.')
      })
    return () => controller.abort()
  }, [accessToken])

  if (error) {
    return <p className="text-red-200">{error}</p>
  }

  if (!stats) {
    return <p className="text-subtle">Loading dashboard…</p>
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon="sparkle"
          label="Revenue (paid)"
          value={formatMoney(stats.revenueMinor, stats.currency)}
        />
        <Stat icon="ticket" label="Tickets sold" value={String(stats.ticketsSold)} />
        <Stat icon="check" label="Checked in" value={String(stats.checkedIn)} />
        <Stat
          icon="calendar"
          label="Active events"
          value={`${stats.events.active} / ${stats.events.total}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-cream">Recent bookings</h2>
            <Button to="/admin/bookings" variant="ghost" size="sm">
              View all
            </Button>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-subtle">No bookings yet.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {recent.map((booking) => (
                <li key={booking.reference}>
                  <Link
                    to={`/admin/bookings/${encodeURIComponent(booking.reference)}`}
                    className="flex items-center justify-between gap-4 py-3 hover:text-cream"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-cream">
                        {booking.purchaserName || booking.purchaserEmail}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {booking.eventName} · <span className="font-mono">{booking.reference}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-sm text-cream">
                        {formatMoney(booking.totalMinor, booking.currency)}
                      </span>
                      <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-cream">Bookings by status</h2>
          <ul className="space-y-3">
            {(['paid', 'pending', 'failed', 'refunded', 'cancelled'] as BookingStatus[]).map(
              (status) => (
                <li key={status} className="flex items-center justify-between text-sm">
                  <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                  <span className="font-semibold text-cream">{stats.bookings[status]}</span>
                </li>
              ),
            )}
            <li className="flex items-center justify-between border-t border-white/10 pt-3 text-sm">
              <span className="text-subtle">Total</span>
              <span className="font-semibold text-cream">{stats.bookings.total}</span>
            </li>
          </ul>

          <h3 className="mt-6 mb-2 font-display text-sm font-bold uppercase tracking-wide text-ash">
            Inventory
          </h3>
          <p className="text-sm text-subtle">
            {stats.remaining} of {stats.capacity} tickets remaining across all ticket types.
          </p>
        </GlassCard>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <QuickLink to="/admin/events" icon="calendar" title="Manage events" body="Create events and ticket types." />
        <QuickLink to="/admin/bookings" icon="ticket" title="Manage bookings" body="Search, refund and cancel orders." />
        <QuickLink to="/admin/promos" icon="sparkle" title="Promo codes" body="Create and edit discount codes." />
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: 'sparkle' | 'ticket' | 'check' | 'calendar'; label: string; value: string }) {
  return (
    <GlassCard className="p-5">
      <Icon name={icon} className="h-5 w-5 text-gold" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ash">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-cream">{value}</p>
    </GlassCard>
  )
}

function QuickLink({ to, icon, title, body }: { to: string; icon: 'calendar' | 'ticket' | 'sparkle'; title: string; body: string }) {
  return (
    <GlassCard to={to} className="p-6">
      <Icon name={icon} className="h-6 w-6 text-gold" />
      <h3 className="mt-3 font-bold text-cream">{title}</h3>
      <p className="mt-1 text-sm text-subtle">{body}</p>
    </GlassCard>
  )
}
