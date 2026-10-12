import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import { ApiError, listAdminEvents } from '../../lib/api'
import { formatShortDate } from '../../lib/format'
import type { EventDetail, EventStatus } from '../../types'

const STATUS_TONE: Record<EventStatus, 'gold' | 'neutral' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  scheduled: 'gold',
  on_sale: 'success',
  sold_out: 'warning',
  ended: 'neutral',
  cancelled: 'danger',
}

export function AdminEventsPage() {
  const { accessToken } = useAuth()
  const [events, setEvents] = useState<EventDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    const controller = new AbortController()
    listAdminEvents(accessToken, controller.signal)
      .then(setEvents)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load events.')
      })
    return () => controller.abort()
  }, [accessToken])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-cream">Events</h2>
        <Button to="/admin/events/new">
          <span aria-hidden="true">+</span> New event
        </Button>
      </div>

      {error ? (
        <p className="text-red-200">{error}</p>
      ) : !events ? (
        <p className="text-subtle">Loading events…</p>
      ) : events.length === 0 ? (
        <GlassCard className="p-8 text-center text-subtle">
          No events yet. Create your first event to start selling tickets.
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Tickets</th>
                  <th className="px-5 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {events.map((event) => {
                  const capacity = event.ticketTypes.reduce((sum, t) => sum + t.capacity, 0)
                  const remaining = event.ticketTypes.reduce((sum, t) => sum + t.remaining, 0)
                  return (
                    <tr key={event.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-cream">{event.name}</p>
                        <p className="font-mono text-xs text-subtle">{event.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-subtle">
                        {formatShortDate(event.startAt, event.timezone)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={STATUS_TONE[event.status]}>{event.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-subtle">
                        {event.ticketTypes.length} types · {remaining}/{capacity} left
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/admin/events/${encodeURIComponent(event.id)}`}
                          className="font-semibold text-gold hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
