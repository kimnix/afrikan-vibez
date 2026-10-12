import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useBooking } from '../booking/BookingContext'
import { Stepper } from '../components/booking/Stepper'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { ApiError, createBooking, getEventBySlug, getQuote } from '../lib/api'
import { saveBookingAccess } from '../lib/bookingAccess'
import { formatEventDate, formatEventTime, formatMoney } from '../lib/format'
import type { EventDetail, Quote } from '../types'

const steps = [
  { label: 'Tickets', to: '/tickets' },
  { label: 'Details', to: '/checkout/details' },
  { label: 'Review', to: '/checkout/review' },
]

export function CheckoutReviewPage() {
  const { state } = useBooking()
  const selection = state.selection

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const idempotencyKey = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    getEventBySlug(selection.eventSlug, controller.signal)
      .then((e) => setEvent(e))
      .catch(() => undefined)
    return () => controller.abort()
  }, [selection])

  useEffect(() => {
    if (!selection) return
    const controller = new AbortController()
    getQuote(
      {
        eventSlug: selection.eventSlug,
        ticketTypeKey: selection.ticketTypeKey,
        quantity: selection.quantity,
        groupSize: selection.groupSize,
        promoCode: state.promoCode,
      },
      controller.signal,
    )
      .then((q) => setQuote(q))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load your order.')
      })
    return () => controller.abort()
  }, [selection, state.promoCode])

  async function handlePayment() {
    if (!selection || !state.purchaser) return
    setSubmitting(true)
    setPayError(null)
    try {
      const result = await createBooking(
        {
          eventSlug: selection.eventSlug,
          ticketTypeKey: selection.ticketTypeKey,
          quantity: selection.quantity,
          groupSize: selection.groupSize,
          promoCode: state.promoCode,
          purchaser: state.purchaser,
          attendees: state.attendees,
          idempotencyKey: idempotencyKey.current,
        },
        accessToken ?? undefined,
      )
      saveBookingAccess({
        reference: result.booking.reference,
        accessToken: result.accessToken,
      })
      // Stripe (and other hosted providers) redirect away; the mock provider
      // resolves on our own payment page.
      if (result.payment.redirectUrl) {
        window.location.href = result.payment.redirectUrl
        return
      }
      navigate('/checkout/payment')
    } catch (err) {
      setPayError(
        err instanceof ApiError
          ? err.message
          : 'Could not start payment. Please try again.',
      )
      setSubmitting(false)
    }
  }

  if (!selection) {
    return <Navigate to="/tickets" replace />
  }
  if (!state.purchaser || state.attendees.length === 0) {
    return <Navigate to="/checkout/details" replace />
  }

  const selected = event?.ticketTypes.find((t) => t.key === selection.ticketTypeKey)

  return (
    <>
      <PageHero eyebrow="Step 3 of 3" title="Review & confirm" description="Check everything before payment.">
        <Stepper steps={steps} current={2} />
      </PageHero>

      <Container className="grid gap-8 py-12 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-cream">{event?.name}</h2>
                {event && (
                  <p className="mt-1 text-sm text-ash">
                    {formatEventDate(event.startAt, event.timezone)} ·{' '}
                    {formatEventTime(event.startAt, event.timezone)} · {event.venue.name}
                  </p>
                )}
              </div>
              <Link
                to="/tickets"
                className="text-sm font-semibold text-gold hover:underline"
              >
                Edit
              </Link>
            </div>
            {selected && (
              <p className="mt-4 text-sm text-subtle">
                {selected.name}
                {selection.groupSize ? ` · group of ${selection.groupSize}` : ''} ×{' '}
                {selection.quantity}
              </p>
            )}
          </GlassCard>

          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold text-cream">Attendees</h2>
              <Link
                to="/checkout/details"
                className="text-sm font-semibold text-gold hover:underline"
              >
                Edit
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {state.attendees.map((a, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-subtle">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-xs text-cream">
                    {i + 1}
                  </span>
                  {a.fullName}
                  {a.email && <span className="text-ash">· {a.email}</span>}
                </li>
              ))}
            </ul>
          </GlassCard>

          {state.purchaser && (
            <GlassCard className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-cream">Contact</h2>
              <p className="mt-3 text-sm text-subtle">
                {state.purchaser.firstName} {state.purchaser.lastName}
                <br />
                {state.purchaser.email}
                {state.purchaser.phone && (
                  <>
                    <br />
                    {state.purchaser.phone}
                  </>
                )}
              </p>
            </GlassCard>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-cream">Order total</h2>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {error}
              </p>
            ) : !quote ? (
              <p className="mt-3 text-sm text-subtle">Calculating…</p>
            ) : (
              <>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {quote.lines.map((line) => (
                    <li key={line.label} className="flex justify-between gap-4 text-subtle">
                      <span>{line.label}</span>
                      <span className="text-cream">
                        {formatMoney(line.amountMinor, quote.currency)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-4 text-subtle">
                    <span>Subtotal</span>
                    <span className="text-cream">
                      {formatMoney(quote.subtotalMinor, quote.currency)}
                    </span>
                  </li>
                  {quote.discountMinor > 0 && (
                    <li className="flex justify-between gap-4 text-emerald-300">
                      <span>Discount{quote.promo ? ` (${quote.promo.code})` : ''}</span>
                      <span>−{formatMoney(quote.discountMinor, quote.currency)}</span>
                    </li>
                  )}
                  <li className="flex justify-between gap-4 text-subtle">
                    <span>Booking fee</span>
                    <span className="text-cream">
                      {quote.feeMinor === 0 ? 'Free' : formatMoney(quote.feeMinor, quote.currency)}
                    </span>
                  </li>
                </ul>
                {quote.promo && (
                  <div className="mt-3">
                    <Badge tone="success">{quote.promo.code} · {quote.promo.label}</Badge>
                  </div>
                )}
                <div className="mt-4 flex justify-between border-t border-white/10 pt-4">
                  <span className="font-semibold text-cream">Total</span>
                  <span className="gold-text font-display text-2xl font-extrabold">
                    {formatMoney(quote.totalMinor, quote.currency)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ash">{quote.feesNote}</p>
              </>
            )}

            <label className="mt-5 flex items-start gap-3 text-sm text-subtle">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#e7c36a]"
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" className="text-gold underline-offset-2 hover:underline">
                  terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-gold underline-offset-2 hover:underline">
                  privacy policy
                </Link>
                .
              </span>
            </label>

            <Button
              className="mt-5"
              size="lg"
              fullWidth
              disabled={!accepted || !quote || Boolean(error) || submitting}
              onClick={handlePayment}
            >
              <Icon name="lock" className="h-4 w-4" />
              {submitting ? 'Starting secure payment…' : 'Proceed to secure payment'}
            </Button>
            {payError && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {payError}
              </p>
            )}
            <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-ash">
              <Icon name="info" className="mr-1 inline h-3.5 w-3.5 text-gold" />
              Payments are processed by our secure provider. Tickets are issued by
              email as soon as payment is confirmed.
            </p>
          </GlassCard>
        </div>
      </Container>
    </>
  )
}
