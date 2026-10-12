import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import { Icon } from '../../components/ui/Icon'
import {
  ApiError,
  downloadAdminReport,
  getEventPerformance,
  getSalesReport,
  getTicketTypeBreakdown,
} from '../../lib/api'
import { formatMoney } from '../../lib/format'
import type {
  EventPerformance,
  SalesReport,
  TicketTypeBreakdown,
} from '../../types'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
]

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

function eventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AdminReportsPage() {
  const { accessToken } = useAuth()

  const [days, setDays] = useState(30)
  const [sales, setSales] = useState<SalesReport | null>(null)
  const [events, setEvents] = useState<EventPerformance[]>([])
  const [ticketTypes, setTicketTypes] = useState<TicketTypeBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const load = useCallback(
    (signal?: AbortSignal) => {
      if (!accessToken) return
      setLoading(true)
      setError(null)
      Promise.all([
        getSalesReport(days, accessToken, signal),
        getEventPerformance(accessToken, signal),
        getTicketTypeBreakdown(accessToken, signal),
      ])
        .then(([salesReport, eventRows, typeRows]) => {
          setSales(salesReport)
          setEvents(eventRows)
          setTicketTypes(typeRows)
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setError(err instanceof ApiError ? err.message : 'Could not load reports.')
        })
        .finally(() => setLoading(false))
    },
    [accessToken, days],
  )

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function exportCsv(path: string, filename: string) {
    if (!accessToken) return
    setExporting(filename)
    setError(null)
    try {
      await downloadAdminReport(path, accessToken, filename)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not download that report.')
    } finally {
      setExporting(null)
    }
  }

  const currency = sales?.currency ?? 'gbp'
  const maxRevenue = Math.max(1, ...(sales?.points ?? []).map((point) => point.revenueMinor))
  const weakestStep = Math.max(1, Math.ceil((sales?.points.length ?? 1) / 12))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-cream">Reports</h2>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => setDays(range.days)}
              aria-pressed={days === range.days}
              className={
                days === range.days
                  ? 'rounded-xl bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-bright'
                  : 'rounded-xl px-4 py-2 text-sm font-medium text-subtle hover:bg-white/[0.05] hover:text-cream'
              }
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="glass"
          size="sm"
          onClick={() => exportCsv('/api/admin/reports/bookings.csv', 'bookings.csv')}
          disabled={exporting !== null}
        >
          <Icon name="download" className="mr-2 h-4 w-4" />
          {exporting === 'bookings.csv' ? 'Exporting…' : 'Bookings CSV'}
        </Button>
        <Button
          variant="glass"
          size="sm"
          onClick={() => exportCsv('/api/admin/reports/subscribers.csv', 'subscribers.csv')}
          disabled={exporting !== null}
        >
          <Icon name="download" className="mr-2 h-4 w-4" />
          {exporting === 'subscribers.csv' ? 'Exporting…' : 'Subscribers CSV'}
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Revenue (${days}d)`} value={formatMoney(sales?.totals.revenueMinor ?? 0, currency)} />
        <Stat label={`Tickets (${days}d)`} value={String(sales?.totals.tickets ?? 0)} />
        <Stat label={`Bookings (${days}d)`} value={String(sales?.totals.bookings ?? 0)} />
        <Stat label={`Refunded (${days}d)`} value={formatMoney(sales?.totals.refundedMinor ?? 0, currency)} />
      </div>

      <GlassCard className="p-6">
        <h3 className="mb-4 font-display text-lg font-bold text-cream">Daily revenue</h3>
        {loading && !sales ? (
          <p className="text-sm text-subtle">Loading chart…</p>
        ) : (
          <div
            role="img"
            aria-label={`Daily paid revenue over the last ${days} days totalling ${formatMoney(sales?.totals.revenueMinor ?? 0, currency)}`}
            className="flex h-40 items-end gap-1"
          >
            {(sales?.points ?? []).map((point, index) => (
              <div
                key={point.date}
                className="group relative flex h-full flex-1 flex-col justify-end"
                title={`${shortDate(point.date)} · ${formatMoney(point.revenueMinor, currency)} · ${point.tickets} tickets`}
              >
                <div
                  className="w-full rounded-t bg-gradient-to-t from-gold/40 to-gold-bright transition-all group-hover:from-gold/60"
                  style={{ height: `${Math.max(2, (point.revenueMinor / maxRevenue) * 100)}%` }}
                />
                {index % weakestStep === 0 && (
                  <span className="mt-1 hidden text-[10px] text-ash sm:block">
                    {shortDate(point.date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <GlassCard className="overflow-hidden">
          <h3 className="border-b border-white/10 px-5 py-4 font-display text-lg font-bold text-cream">
            Event performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-ash">
                <tr>
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Sold</th>
                  <th className="px-5 py-3 font-semibold">Revenue</th>
                  <th className="px-5 py-3 font-semibold">Checked in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {events.map((event) => (
                  <tr key={event.eventId} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <span className="block font-medium text-cream">{event.name}</span>
                      <span className="mt-1 block h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gold"
                          style={{ width: `${Math.min(100, event.sellThrough)}%` }}
                        />
                      </span>
                    </td>
                    <td className="px-5 py-4 text-subtle">{eventDate(event.startAt)}</td>
                    <td className="px-5 py-4 text-subtle">
                      {event.ticketsSold} / {event.capacity}
                    </td>
                    <td className="px-5 py-4 font-medium text-cream">
                      {formatMoney(event.revenueMinor, event.currency)}
                    </td>
                    <td className="px-5 py-4 text-subtle">{event.checkedIn}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-subtle">
                      {loading ? 'Loading…' : 'No events yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="mb-4 font-display text-lg font-bold text-cream">Sales by ticket type</h3>
          <ul className="space-y-3">
            {ticketTypes.map((type) => (
              <li key={type.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-cream">{type.name}</span>
                  <span className="block text-xs text-subtle">{type.tickets} tickets</span>
                </span>
                <span className="shrink-0 font-semibold text-cream">
                  {formatMoney(type.revenueMinor, currency)}
                </span>
              </li>
            ))}
            {ticketTypes.length === 0 && (
              <li className="text-sm text-subtle">{loading ? 'Loading…' : 'No sales yet.'}</li>
            )}
          </ul>
        </GlassCard>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ash">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-cream">{value}</p>
    </GlassCard>
  )
}
