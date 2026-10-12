import { useEffect, useMemo, useState } from 'react'
import { EventCard } from '../components/events/EventCard'
import { Container } from '../components/ui/Container'
import { PageHero } from '../components/ui/PageHero'
import { getEvents } from '../lib/api'
import type { EventDetail } from '../types'

type Period = 'upcoming' | 'past' | 'all'

export function EventsPage() {
  const [events, setEvents] = useState<EventDetail[] | null>(null)
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState<Period>('upcoming')

  useEffect(() => {
    const controller = new AbortController()
    getEvents(controller.signal)
      .then((list) => setEvents(list as EventDetail[]))
      .catch(() => setEvents([]))
    return () => controller.abort()
  }, [])

  const filtered = useMemo(() => {
    if (!events) return []
    const now = Date.now()
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      const starts = new Date(e.startAt).getTime()
      if (period === 'upcoming' && starts < now) return false
      if (period === 'past' && starts >= now) return false
      if (!q) return true
      return [e.name, e.summary, e.venue.city, e.venue.name]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [events, query, period])

  const periods: { key: Period; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'all', label: 'All' },
  ]

  return (
    <>
      <PageHero
        eyebrow="Discover"
        title="Events"
        description="Browse African Vibes events. Search by name or city and filter by date."
      />
      <Container className="py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <label htmlFor="event-search" className="sr-only">
              Search events
            </label>
            <input
              id="event-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events or cities…"
              className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
            />
          </div>
          <div
            className="flex gap-2"
            role="group"
            aria-label="Filter by period"
          >
            {periods.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                aria-pressed={period === p.key}
                className={
                  period === p.key
                    ? 'rounded-pill border border-gold/50 bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-bright'
                    : 'rounded-pill border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-subtle hover:text-cream'
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {!events ? (
          <p className="text-subtle">Loading events…</p>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-card p-10 text-center">
            <p className="text-lg font-semibold text-cream">No events found</p>
            <p className="mt-2 text-sm text-subtle">
              Try a different search or period.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Container>
    </>
  )
}
