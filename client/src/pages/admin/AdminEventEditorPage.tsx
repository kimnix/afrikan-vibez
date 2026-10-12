import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import {
  ApiError,
  createAdminEvent,
  createAdminTicketType,
  getAdminEvent,
  updateAdminEvent,
  updateAdminTicketType,
} from '../../lib/api'
import { formatMoney } from '../../lib/format'
import type { EventDetail, EventInput, EventStatus, TicketCategoryKey, TicketTypeInput } from '../../types'

const STATUSES: EventStatus[] = [
  'draft',
  'scheduled',
  'on_sale',
  'sold_out',
  'ended',
  'cancelled',
]

const TICKET_KEYS: TicketCategoryKey[] = ['standard', 'group', 'vip', 'exclusive']

interface FormState {
  slug: string
  name: string
  tagline: string
  headline: string
  summary: string
  description: string
  startAt: string
  endAt: string
  timezone: string
  currency: string
  status: EventStatus
  featured: boolean
  venueName: string
  venueAddress: string
  venueCity: string
  venueCountry: string
  venueMapUrl: string
  feePercent: string
  feeNote: string
}

function emptyForm(): FormState {
  return {
    slug: '',
    name: '',
    tagline: '',
    headline: '',
    summary: '',
    description: '',
    startAt: '',
    endAt: '',
    timezone: 'Europe/London',
    currency: 'gbp',
    status: 'draft',
    featured: false,
    venueName: '',
    venueAddress: '',
    venueCity: '',
    venueCountry: 'United Kingdom',
    venueMapUrl: '',
    feePercent: '1.5',
    feeNote: '',
  }
}

function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromEvent(event: EventDetail): FormState {
  return {
    slug: event.slug,
    name: event.name,
    tagline: event.tagline,
    headline: event.headline,
    summary: event.summary,
    description: event.description,
    startAt: toLocalInput(event.startAt),
    endAt: toLocalInput(event.endAt),
    timezone: event.timezone,
    currency: event.currency,
    status: event.status,
    featured: Boolean(event.featured),
    venueName: event.venue.name,
    venueAddress: event.venue.addressLine,
    venueCity: event.venue.city,
    venueCountry: event.venue.country,
    venueMapUrl: event.venue.mapUrl ?? '',
    feePercent: String(event.fees.bookingFeePercent),
    feeNote: event.fees.note,
  }
}

export function AdminEventEditorPage() {
  const { id } = useParams()
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !accessToken) return
    const controller = new AbortController()
    setLoading(true)
    getAdminEvent(id, accessToken, controller.signal)
      .then((loaded) => {
        setEvent(loaded)
        setForm(fromEvent(loaded))
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load the event.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [id, accessToken])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!accessToken) return
    setBusy(true)
    setError(null)
    setMessage(null)

    const payload: EventInput = {
      slug: form.slug.trim().toLowerCase(),
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      headline: form.headline.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      timezone: form.timezone.trim(),
      currency: form.currency.trim().toLowerCase(),
      status: form.status,
      featured: form.featured,
      venue: {
        name: form.venueName.trim(),
        addressLine: form.venueAddress.trim(),
        city: form.venueCity.trim(),
        country: form.venueCountry.trim(),
        mapUrl: form.venueMapUrl.trim() || undefined,
      },
      fees: {
        bookingFeePercent: Number(form.feePercent) || 0,
        note: form.feeNote.trim(),
      },
    }

    try {
      if (event) {
        const updated = await updateAdminEvent(event.id, payload, accessToken)
        setEvent(updated)
        setForm(fromEvent(updated))
        setMessage('Event saved.')
      } else {
        const created = await createAdminEvent(payload, accessToken)
        setEvent(created)
        setForm(fromEvent(created))
        setMessage('Event created. You can now add ticket types below.')
        navigate(`/admin/events/${created.id}`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the event.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-subtle">Loading event…</p>

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-xl font-bold text-cream">
          {event ? `Edit: ${event.name}` : 'New event'}
        </h2>
        <Button to="/admin/events" variant="glass" size="sm">
          Back to events
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <GlassCard className="space-y-5 p-6">
          <h3 className="font-display text-base font-bold text-cream">Details</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" value={form.name} onChange={(v) => set('name', v)} required />
            <Field
              label="Slug"
              value={form.slug}
              onChange={(v) => set('slug', v)}
              placeholder="african-vibes-2027"
              required
            />
            <Field label="Tagline" value={form.tagline} onChange={(v) => set('tagline', v)} />
            <Field label="Headline" value={form.headline} onChange={(v) => set('headline', v)} />
          </div>
          <TextArea label="Summary" value={form.summary} onChange={(v) => set('summary', v)} rows={2} />
          <TextArea label="Description" value={form.description} onChange={(v) => set('description', v)} rows={4} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Starts" type="datetime-local" value={form.startAt} onChange={(v) => set('startAt', v)} required />
            <Field label="Ends" type="datetime-local" value={form.endAt} onChange={(v) => set('endAt', v)} required />
            <Field label="Timezone" value={form.timezone} onChange={(v) => set('timezone', v)} />
            <Field label="Currency" value={form.currency} onChange={(v) => set('currency', v)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Status</span>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as EventStatus)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-ink">
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-3 pb-3 text-sm text-subtle">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set('featured', e.target.checked)}
                className="h-4 w-4 accent-[#e7c36a]"
              />
              Featured event
            </label>
          </div>
        </GlassCard>

        <GlassCard className="space-y-5 p-6">
          <h3 className="font-display text-base font-bold text-cream">Venue & fees</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Venue name" value={form.venueName} onChange={(v) => set('venueName', v)} />
            <Field label="Address" value={form.venueAddress} onChange={(v) => set('venueAddress', v)} />
            <Field label="City" value={form.venueCity} onChange={(v) => set('venueCity', v)} />
            <Field label="Country" value={form.venueCountry} onChange={(v) => set('venueCountry', v)} />
            <Field label="Map URL" value={form.venueMapUrl} onChange={(v) => set('venueMapUrl', v)} />
            <Field label="Booking fee %" value={form.feePercent} onChange={(v) => set('feePercent', v)} />
          </div>
          <TextArea label="Fees note" value={form.feeNote} onChange={(v) => set('feeNote', v)} rows={2} />
        </GlassCard>

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

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : event ? 'Save event' : 'Create event'}
          </Button>
        </div>
      </form>

      {event && (
        <TicketTypesSection
          event={event}
          onUpdated={(updated) => setEvent(updated)}
          accessToken={accessToken!}
        />
      )}
    </div>
  )
}

function TicketTypesSection({
  event,
  onUpdated,
  accessToken,
}: {
  event: EventDetail
  onUpdated: (event: EventDetail) => void
  accessToken: string
}) {
  const emptyTicket = {
    id: '',
    key: 'standard' as TicketCategoryKey,
    name: '',
    tagline: '',
    price: '',
    includesPeople: '1',
    capacity: '',
    remaining: '',
    onSale: true,
    featured: false,
    benefits: '',
    groupSizes: '',
  }
  const [form, setForm] = useState(emptyTicket)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit(ticket: EventDetail['ticketTypes'][number]) {
    setError(null)
    setForm({
      id: ticket.id,
      key: ticket.key,
      name: ticket.name,
      tagline: ticket.tagline,
      price: String(ticket.priceMinor / 100),
      includesPeople: String(ticket.includesPeople),
      capacity: String(ticket.capacity),
      remaining: String(ticket.remaining),
      onSale: ticket.onSale,
      featured: Boolean(ticket.featured),
      benefits: ticket.benefits.join(', '),
      groupSizes: (ticket.groupSizes ?? []).join(', '),
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const groupSizes = form.groupSizes
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n >= 2)

    const payload: TicketTypeInput = {
      key: form.key,
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      priceMinor: Math.round((Number(form.price) || 0) * 100),
      includesPeople: Number(form.includesPeople) || 1,
      capacity: Number(form.capacity) || 0,
      remaining: form.remaining === '' ? undefined : Number(form.remaining),
      onSale: form.onSale,
      featured: form.featured,
      benefits: form.benefits
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      groupSizes: groupSizes.length ? groupSizes : undefined,
    }

    try {
      const updated = form.id
        ? await updateAdminTicketType(form.id, payload, accessToken)
        : await createAdminTicketType(event.id, payload, accessToken)
      onUpdated(updated)
      setForm(emptyTicket)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the ticket type.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <GlassCard className="space-y-5 p-6">
      <h3 className="font-display text-base font-bold text-cream">Ticket types</h3>

      <ul className="divide-y divide-white/10">
        {event.ticketTypes.map((ticket) => (
          <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge tone="gold">{ticket.key}</Badge>
                <span className="font-semibold text-cream">{ticket.name}</span>
                {!ticket.onSale && <Badge tone="neutral">off sale</Badge>}
              </div>
              <p className="mt-1 text-xs text-subtle">
                {formatMoney(ticket.priceMinor, event.currency)} · {ticket.remaining}/{ticket.capacity} left
                {ticket.includesPeople > 1 ? ` · ${ticket.includesPeople} people` : ''}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(ticket)}>
              Edit
            </Button>
          </li>
        ))}
        {event.ticketTypes.length === 0 && (
          <li className="py-3 text-sm text-subtle">No ticket types yet.</li>
        )}
      </ul>

      <form onSubmit={submit} className="space-y-4 border-t border-white/10 pt-5">
        <h4 className="text-sm font-bold text-cream">
          {form.id ? `Edit ticket: ${form.name}` : 'Add a ticket type'}
        </h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-cream/90">Key</span>
            <select
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value as TicketCategoryKey })}
              className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
            >
              {TICKET_KEYS.map((k) => (
                <option key={k} value={k} className="bg-ink">
                  {k}
                </option>
              ))}
            </select>
          </label>
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Price" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="30.00" />
          <Field label="People included" value={form.includesPeople} onChange={(v) => setForm({ ...form, includesPeople: v })} />
          <Field label="Capacity" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />
          <Field label="Remaining" value={form.remaining} onChange={(v) => setForm({ ...form, remaining: v })} placeholder="defaults to capacity" />
          <Field label="Group sizes" value={form.groupSizes} onChange={(v) => setForm({ ...form, groupSizes: v })} placeholder="4, 6, 10" />
          <Field label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
        </div>
        <TextArea label="Benefits" value={form.benefits} onChange={(v) => setForm({ ...form, benefits: v })} rows={2} />
        <div className="flex flex-wrap items-center gap-5 text-sm text-subtle">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.onSale}
              onChange={(e) => setForm({ ...form, onSale: e.target.checked })}
              className="h-4 w-4 accent-[#e7c36a]"
            />
            On sale
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="h-4 w-4 accent-[#e7c36a]"
            />
            Featured
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : form.id ? 'Save ticket type' : 'Add ticket type'}
          </Button>
          {form.id && (
            <Button type="button" variant="ghost" onClick={() => setForm(emptyTicket)}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </GlassCard>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-cream/90">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-cream/90">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
      />
    </label>
  )
}
