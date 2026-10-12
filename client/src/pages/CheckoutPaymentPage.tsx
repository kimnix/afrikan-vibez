import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Stepper } from '../components/booking/Stepper'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { ApiError, confirmMockPayment, getBooking } from '../lib/api'
import { loadBookingAccess } from '../lib/bookingAccess'
import { formatMoney } from '../lib/format'
import type { BookingDetail } from '../types'

const steps = [
  { label: 'Tickets', to: '/tickets' },
  { label: 'Details', to: '/checkout/details' },
  { label: 'Payment', to: '/checkout/payment' },
]

export function CheckoutPaymentPage() {
  const navigate = useNavigate()
  const access = useMemo(() => loadBookingAccess(), [])

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!access) return
    const controller = new AbortController()
    getBooking(access.reference, { bookingToken: access.accessToken }, controller.signal)
      .then((b) => {
        setBooking(b)
        if (b.status === 'paid') {
          navigate(`/checkout/confirmation?ref=${encodeURIComponent(b.reference)}`, {
            replace: true,
          })
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof ApiError ? err.message : 'Could not load your booking.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [access, navigate])

  if (!access) return <Navigate to="/tickets" replace />

  async function resolve(outcome: 'succeed' | 'fail') {
    if (!access) return
    setBusy(true)
    setError(null)
    try {
      const result = await confirmMockPayment({
        reference: access.reference,
        token: access.accessToken,
        outcome,
      })
      if (result.outcome === 'paid') {
        navigate(`/checkout/confirmation?ref=${encodeURIComponent(result.booking.reference)}`)
        return
      }
      setBooking(result.booking)
      setError('Your payment was declined. You can try again.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Payment could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const isMock = booking?.paymentProvider === 'mock'

  return (
    <>
      <PageHero
        eyebrow="Secure checkout"
        title="Payment"
        description="Complete your purchase to receive your tickets."
      >
        <Stepper steps={steps} current={2} />
      </PageHero>

      <Container className="grid gap-8 py-12 lg:grid-cols-[1.3fr_0.7fr]">
        <GlassCard className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-cream">Payment method</h2>
          {loading ? (
            <p className="mt-3 text-sm text-subtle">Loading your order…</p>
          ) : !booking ? (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error ?? 'We could not find this booking.'}
            </p>
          ) : isMock ? (
            <>
              <p className="mt-3 text-sm text-subtle">
                This environment uses a sandbox payment provider. Choose an outcome
                to simulate the payment result.
              </p>
              {error && (
                <p role="alert" className="mt-4 text-sm text-red-300">
                  {error}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  disabled={busy}
                  onClick={() => resolve('succeed')}
                >
                  <Icon name="lock" className="h-4 w-4" />
                  {busy ? 'Processing…' : 'Pay now'}
                </Button>
                <Button
                  size="lg"
                  variant="glass"
                  disabled={busy}
                  onClick={() => resolve('fail')}
                >
                  Simulate failed payment
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-subtle">
              Your payment is being handled by our payment provider. Complete it in
              the provider window to receive your tickets.
            </p>
          )}
        </GlassCard>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-cream">Order summary</h2>
            {!booking ? (
              <p className="mt-3 text-sm text-subtle">—</p>
            ) : (
              <>
                <p className="mt-3 text-sm text-cream">{booking.eventName}</p>
                <p className="mt-1 text-sm text-subtle">
                  {booking.ticketTypeName}
                  {booking.groupSize ? ` · group of ${booking.groupSize}` : ''} ×{' '}
                  {booking.quantity}
                </p>
                <div className="mt-4 flex justify-between border-t border-white/10 pt-4">
                  <span className="font-semibold text-cream">Total due</span>
                  <span className="gold-text font-display text-2xl font-extrabold">
                    {formatMoney(booking.totalMinor, booking.currency)}
                  </span>
                </div>
                <div className="mt-3">
                  <Badge tone="neutral">Ref {booking.reference}</Badge>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      </Container>
    </>
  )
}
