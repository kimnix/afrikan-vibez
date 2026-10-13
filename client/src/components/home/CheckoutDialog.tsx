import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooking } from '../../booking/BookingContext'
import { ApiError, getQuote } from '../../lib/api'
import { formatMoney } from '../../lib/format'
import type { EventDetail, Quote, TicketCategoryKey } from '../../types'
import { Icon } from '../ui/Icon'

export function CheckoutDialog({
  event,
  ticketKey,
  onClose,
}: {
  event: EventDetail
  ticketKey: TicketCategoryKey | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const { setSelection, setPromoCode } = useBooking()

  const [quantity, setQuantity] = useState(1)
  const [groupSize, setGroupSize] = useState<number | null>(null)
  const [promoInput, setPromoInput] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selected = ticketKey
    ? event.ticketTypes.find((t) => t.key === ticketKey) ?? null
    : null
  const isGroup = selected?.key === 'group'
  const maxQty = Math.min(10, quote?.maxQuantity ?? 10)

  // Reset the selection each time the dialog opens.
  useEffect(() => {
    if (!ticketKey) return
    const ticket = event.ticketTypes.find((t) => t.key === ticketKey) ?? null
    setQuantity(1)
    setGroupSize(ticket?.groupSizes?.[0] ?? null)
    setPromoInput('')
    setAppliedPromo(null)
    setError(null)
  }, [ticketKey, event])

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!ticketKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [ticketKey, onClose])

  // Server-authoritative quote, refreshed whenever the request changes.
  useEffect(() => {
    if (!ticketKey || !selected) return
    const controller = new AbortController()
    setLoading(true)
    getQuote(
      {
        eventSlug: event.slug,
        ticketTypeKey: selected.key,
        quantity,
        groupSize,
        promoCode: appliedPromo,
      },
      controller.signal,
    )
      .then((q) => {
        setQuote(q)
        setError(null)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setQuote(null)
        setError(err instanceof ApiError ? err.message : 'Could not price this selection.')
        if (appliedPromo) setAppliedPromo(null)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [ticketKey, selected, quantity, groupSize, appliedPromo, event.slug])

  if (!ticketKey || !selected) return null

  function confirm() {
    if (!selected || !quote || !quote.available) return
    setSelection({
      eventSlug: event.slug,
      ticketTypeKey: selected.key,
      quantity,
      groupSize,
    })
    setPromoCode(appliedPromo)
    onClose()
    navigate('/checkout/details')
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="glass-strong animate-float-in max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] p-6 sm:rounded-card sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="av-eyebrow">
              <span className="av-dot" />
              Secure checkout
            </p>
            <h2
              id="checkout-dialog-title"
              className="mt-3 text-2xl font-bold text-cream"
            >
              {selected.name}
            </h2>
            <p className="mt-1 text-sm text-ash">{selected.tagline}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="rounded-full border border-white/15 bg-white/[0.05] p-2 text-cream/80 transition hover:text-cream"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {selected.groupSizes?.length ? (
          <div className="mt-6">
            <span className="mb-2 block text-sm font-medium text-cream/90">
              Group size
            </span>
            <div className="flex flex-wrap gap-2">
              {selected.groupSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setGroupSize(size)}
                  aria-pressed={groupSize === size}
                  className={
                    groupSize === size
                      ? 'rounded-pill border border-gold/50 bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-bright'
                      : 'rounded-pill border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-subtle transition hover:text-cream'
                  }
                >
                  {size} people
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <span className="mb-2 block text-sm font-medium text-cream/90">
            {isGroup ? 'Number of groups' : 'Quantity'}
          </span>
          <div className="inline-flex items-center rounded-xl border border-white/15 bg-white/[0.04]">
            <button
              type="button"
              className="px-4 py-2 text-lg text-cream disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-10 text-center font-semibold text-cream">
              {quantity}
            </span>
            <button
              type="button"
              className="px-4 py-2 text-lg text-cream disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          {quote && (
            <span className="ml-3 text-xs text-ash">
              {quote.people} {quote.people === 1 ? 'person' : 'people'} ·{' '}
              {quote.remaining} remaining
            </span>
          )}
        </div>

        <div className="mt-6">
          {appliedPromo ? (
            <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
              <span className="text-sm font-semibold text-gold-bright">
                {appliedPromo} applied
              </span>
              <button
                type="button"
                onClick={() => {
                  setAppliedPromo(null)
                  setPromoInput('')
                }}
                className="text-xs font-semibold text-subtle hover:text-cream"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Promotional code</span>
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promotional code"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setAppliedPromo(promoInput.trim().toUpperCase() || null)}
                disabled={!promoInput.trim()}
                className="glass rounded-xl px-4 text-sm font-semibold text-cream transition disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : !quote ? (
            <p className="text-sm text-subtle">
              {loading ? 'Pricing your selection…' : 'Select an option to see your total.'}
            </p>
          ) : (
            <>
              <ul className="space-y-2 text-sm">
                {quote.lines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4 text-subtle">
                    <span>{line.label}</span>
                    <span className="text-cream">
                      {formatMoney(line.amountMinor, event.currency)}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between gap-4 text-subtle">
                  <span>Booking fee</span>
                  <span className="text-cream">
                    {quote.feeMinor === 0
                      ? 'Free'
                      : formatMoney(quote.feeMinor, event.currency)}
                  </span>
                </li>
                {quote.discountMinor > 0 && (
                  <li className="flex justify-between gap-4 text-sage">
                    <span>Discount{quote.promo ? ` (${quote.promo.code})` : ''}</span>
                    <span>−{formatMoney(quote.discountMinor, event.currency)}</span>
                  </li>
                )}
              </ul>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-semibold text-cream">Total</span>
                <span className="gold-text font-display text-2xl font-bold">
                  {formatMoney(quote.totalMinor, event.currency)}
                </span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={!quote || loading || !quote.available}
          className="button-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-pill px-6 py-3.5 text-sm font-semibold text-ink transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Checking availability…' : 'Continue to details'}
          <Icon name="arrowRight" className="h-4 w-4" />
        </button>
        {quote && !quote.available && (
          <p className="mt-2 text-center text-xs text-red-300">
            Not enough tickets remaining for this selection.
          </p>
        )}
      </div>
    </div>
  )
}
