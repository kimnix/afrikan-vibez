import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useBooking } from '../booking/BookingContext'
import { Stepper } from '../components/booking/Stepper'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { getEventBySlug } from '../lib/api'
import type { AttendeeInput, EventDetail, PurchaserInput } from '../types'

const steps = [
  { label: 'Tickets', to: '/tickets' },
  { label: 'Details', to: '/checkout/details' },
  { label: 'Review', to: '/checkout/review' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function peopleFor(
  event: EventDetail,
  key: string,
  quantity: number,
  groupSize: number | null,
): number {
  const ticket = event.ticketTypes.find((t) => t.key === key)
  if (!ticket) return quantity
  const perUnit = ticket.key === 'group' ? groupSize ?? ticket.includesPeople : ticket.includesPeople
  return perUnit * quantity
}

export function CheckoutDetailsPage() {
  const navigate = useNavigate()
  const { state, setAttendees, setPurchaser } = useBooking()
  const selection = state.selection

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [attendees, setLocalAttendees] = useState<AttendeeInput[]>(
    state.attendees.length ? state.attendees : [],
  )
  const [purchaser, setLocalPurchaser] = useState<PurchaserInput>(
    state.purchaser ?? {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      marketingOptIn: false,
    },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    getEventBySlug(selection.eventSlug, controller.signal)
      .then((e) => setEvent(e))
      .catch(() => undefined)
    return () => controller.abort()
  }, [selection])

  const people = useMemo(
    () =>
      event && selection
        ? peopleFor(event, selection.ticketTypeKey, selection.quantity, selection.groupSize)
        : 0,
    [event, selection],
  )

  // Keep the attendee list the right length for the current selection.
  useEffect(() => {
    if (!people) return
    setLocalAttendees((prev) => {
      const next = Array.from({ length: people }, (_, i) => prev[i] ?? { fullName: '', email: '' })
      return next
    })
  }, [people])

  if (!selection) {
    return <Navigate to="/tickets" replace />
  }

  if (!event) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  function updateAttendee(index: number, patch: Partial<AttendeeInput>) {
    setLocalAttendees((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    )
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    attendees.forEach((a, i) => {
      if (!a.fullName.trim()) next[`attendee-${i}`] = 'Enter a name for this ticket.'
    })
    if (!purchaser.firstName.trim()) next.firstName = 'Required'
    if (!purchaser.lastName.trim()) next.lastName = 'Required'
    if (!EMAIL_RE.test(purchaser.email.trim())) next.email = 'Enter a valid email address.'
    if (purchaser.phone && !/^[+\d][\d\s-]{6,}$/.test(purchaser.phone.trim()))
      next.phone = 'Enter a valid phone number.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      const firstError = document.querySelector('[aria-invalid="true"]')
      if (firstError instanceof HTMLElement) firstError.focus()
      return
    }
    setAttendees(
      attendees.map((a) => ({ fullName: a.fullName.trim(), email: a.email?.trim() || undefined })),
    )
    setPurchaser({
      ...purchaser,
      firstName: purchaser.firstName.trim(),
      lastName: purchaser.lastName.trim(),
      email: purchaser.email.trim(),
      phone: purchaser.phone?.trim() || undefined,
    })
    navigate('/checkout/review')
  }

  const inputClass =
    'w-full rounded-xl border bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:outline-none'
  const okBorder = 'border-white/15 focus:border-gold'
  const badBorder = 'border-red-400/60'

  return (
    <>
      <PageHero eyebrow="Step 2 of 3" title="Your details" description="Tickets are issued to named attendees.">
        <Stepper steps={steps} current={1} />
      </PageHero>

      <Container className="py-12">
        <form onSubmit={onSubmit} noValidate className="mx-auto max-w-3xl space-y-6">
          <GlassCard className="p-6 sm:p-8">
            <h2 className="text-lg font-bold text-cream">Attendees</h2>
            <p className="mt-1 text-sm text-ash">
              {people} {people === 1 ? 'ticket' : 'tickets'} — each gets its own QR code.
            </p>
            <div className="mt-5 space-y-4">
              {attendees.map((attendee, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2"
                >
                  <div>
                    <label
                      htmlFor={`attendee-name-${index}`}
                      className="mb-1.5 block text-sm font-medium text-cream/90"
                    >
                      Attendee {index + 1} name <span className="text-gold">*</span>
                    </label>
                    <input
                      id={`attendee-name-${index}`}
                      type="text"
                      autoComplete="name"
                      value={attendee.fullName}
                      aria-invalid={Boolean(errors[`attendee-${index}`])}
                      aria-describedby={
                        errors[`attendee-${index}`] ? `attendee-${index}-error` : undefined
                      }
                      onChange={(e) => updateAttendee(index, { fullName: e.target.value })}
                      className={`${inputClass} ${errors[`attendee-${index}`] ? badBorder : okBorder}`}
                    />
                    {errors[`attendee-${index}`] && (
                      <p id={`attendee-${index}-error`} className="mt-1 text-xs text-red-300">
                        {errors[`attendee-${index}`]}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor={`attendee-email-${index}`}
                      className="mb-1.5 block text-sm font-medium text-cream/90"
                    >
                      Email (optional)
                    </label>
                    <input
                      id={`attendee-email-${index}`}
                      type="email"
                      autoComplete="email"
                      value={attendee.email ?? ''}
                      onChange={(e) => updateAttendee(index, { email: e.target.value })}
                      className={`${inputClass} ${okBorder}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-6 sm:p-8">
            <h2 className="text-lg font-bold text-cream">Purchaser contact</h2>
            <p className="mt-1 text-sm text-ash">
              Confirmation and receipts are sent here.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                id="firstName"
                label="First name"
                value={purchaser.firstName}
                error={errors.firstName}
                autoComplete="given-name"
                onChange={(v) => setLocalPurchaser((p) => ({ ...p, firstName: v }))}
              />
              <Field
                id="lastName"
                label="Last name"
                value={purchaser.lastName}
                error={errors.lastName}
                autoComplete="family-name"
                onChange={(v) => setLocalPurchaser((p) => ({ ...p, lastName: v }))}
              />
              <Field
                id="email"
                label="Email"
                type="email"
                value={purchaser.email}
                error={errors.email}
                autoComplete="email"
                onChange={(v) => setLocalPurchaser((p) => ({ ...p, email: v }))}
              />
              <Field
                id="phone"
                label="Phone (optional)"
                type="tel"
                value={purchaser.phone ?? ''}
                error={errors.phone}
                autoComplete="tel"
                onChange={(v) => setLocalPurchaser((p) => ({ ...p, phone: v }))}
              />
            </div>
            <label className="mt-4 flex items-start gap-3 text-sm text-subtle">
              <input
                type="checkbox"
                checked={purchaser.marketingOptIn}
                onChange={(e) =>
                  setLocalPurchaser((p) => ({ ...p, marketingOptIn: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 accent-[#e7c36a]"
              />
              <span>
                Send me event news and presales. I can unsubscribe any time.
              </span>
            </label>
          </GlassCard>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" to="/tickets">
              <Icon name="arrowRight" className="h-4 w-4 rotate-180" />
              Back to tickets
            </Button>
            <Button type="submit" size="lg">
              Continue to review
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Container>
    </>
  )
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
}) {
  const inputClass =
    'w-full rounded-xl border bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:outline-none'
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-cream/90">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} ${error ? 'border-red-400/60' : 'border-white/15 focus:border-gold'}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
