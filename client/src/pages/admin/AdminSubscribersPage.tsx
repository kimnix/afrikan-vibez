import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { GlassCard } from '../../components/ui/GlassCard'
import { ApiError, listAdminSubscribers } from '../../lib/api'
import type { NewsletterListResult, SubscriberStatus } from '../../types'

type Filter = 'all' | SubscriberStatus

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AdminSubscribersPage() {
  const { accessToken } = useAuth()

  const [filter, setFilter] = useState<Filter>('all')
  const [result, setResult] = useState<NewsletterListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    listAdminSubscribers(
      { status: filter === 'all' ? undefined : filter, limit: 100 },
      accessToken,
    )
      .then(setResult)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load subscribers.'),
      )
      .finally(() => setLoading(false))
  }, [accessToken, filter])

  useEffect(load, [load])

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'subscribed', label: 'Subscribed' },
    { key: 'unsubscribed', label: 'Unsubscribed' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-cream">Newsletter subscribers</h2>
        <div className="flex gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={
                filter === item.key
                  ? 'rounded-xl bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-bright'
                  : 'rounded-xl px-4 py-2 text-sm font-medium text-subtle hover:bg-white/[0.05] hover:text-cream'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <GlassCard className="p-5">
        <p className="text-sm text-subtle">
          {loading
            ? 'Loading subscribers…'
            : `${result?.total ?? 0} subscriber${(result?.total ?? 0) === 1 ? '' : 's'}`}
        </p>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-ash">
              <tr>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Source</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold">Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(result?.subscribers ?? []).map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-white/[0.03]">
                  <td className="px-5 py-4 font-medium text-cream">{subscriber.email}</td>
                  <td className="px-5 py-4 text-subtle">{subscriber.firstName ?? '—'}</td>
                  <td className="px-5 py-4">
                    <Badge tone={subscriber.status === 'subscribed' ? 'success' : 'neutral'}>
                      {subscriber.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs text-subtle">{subscriber.source ?? '—'}</td>
                  <td className="px-5 py-4 text-subtle">{formatDate(subscriber.createdAt)}</td>
                  <td className="px-5 py-4 text-subtle">{formatDate(subscriber.unsubscribedAt)}</td>
                </tr>
              ))}
              {!loading && (result?.subscribers ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-subtle">
                    No subscribers to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}
