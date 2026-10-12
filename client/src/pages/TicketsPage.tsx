import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBooking } from '../booking/BookingContext'
import { Stepper } from '../components/booking/Stepper'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { ApiError, getEventBySlug, getFeaturedEvent, getQuote } from '../lib/api'
import { formatMoney } from '../lib/format'
import type { EventDetail, Quote, TicketCategoryKey } from '../types'

const steps = [
  { label: 'Tickets', to: '/tickets' },
  { label: 'Details', to: '/checkout/details' },
  { label: 'Review', to: '/checkout/review' },
]

export function TicketsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { state: booking, setSelection, setPromoCode } = useBooking()

  const eventSlug = params.get('event')
  const initialType = params.get('type') as TicketCategoryKey | null

  const [event, setEvent] = useState<EventDetail | null>(null)
  const [selectedKey, setSelectedKey] = useState<TicketCategoryKey | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [groupSize, setGroupSize] = useState<number | null>(null)

  const [promoInput, setPromoInput] = useState(() => booking.promoCode ?? '')
  const appliedPromo = booking.promoCode
  const [promoError, setPromoError] = useState<string | null>(null)

  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const load = eventSlug
      ? getEventBySlug(eventSlug, controller.signal)
      : getFeaturedEvent(controller.signal)
    load.then((e) => setEvent(e)).catch(() => undefined)
    return () => controller.abort()
  }, [eventSlug])

  useEffect(() => {
    if (!event) return
    const first =
      initialType ??
      event.ticketTypes.find((t) => t.featured)?.key ??
      event.ticketTypes[0]?.key
    if (first) setSelectedKey(first)
  }, [event, initialType])

  const selected = useMemo(() => {
    if (!event || !selectedKey) return null
    return event.ticketTypes.find((t) => t.key === selectedKey) ?? null
  }, [event, selectedKey])

  useEffect(() => {
    if (selected?.groupSizes?.length) setGroupSize(selected.groupSizes[0] ?? null)
    else setGroupSize(null)
    setQuantity(1)
    setQuoteError(null)
  }, [selected])

  // Server-authoritative quote, refreshed whenever the request changes.
  useEffect(() => {
    if (!event || !selected) return
    const controller = new AbortController()
    setLoadingQuote(true)
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
        setQuoteError(null)
        setPromoError(null)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setQuote(null)
        const message =
          err instanceof ApiError ? err.message : 'Could not price this selection.'
        if (appliedPromo) {
          setPromoError(message)
          setPromoCode(null)
        } else {
          setQuoteError(message)
        }
      })
      .finally(() => setLoadingQuote(false))
    return () => controller.abort()
  }, [event, selected, quantity, groupSize, appliedPromo])

  if (!event) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading tickets"
        />
      </div>
    )
  }

  const isGroup = selected?.key === 'group'
  const maxQty = Math.min(10, quote?.maxQuantity ?? 10)

  function applyPromo() {
    setPromoError(null)
    setPromoCode(promoInput.trim().toUpperCase() || null)
  }

  function removePromo() {
    setPromoCode(null)
    setPromoInput('')
    setPromoError(null)
  }

  function continueToDetails() {
    if (!selected) return
    setSelection({
      eventSlug: event!.slug,
      ticketTypeKey: selected.key,
      quantity,
      groupSize,
    })
    navigate('/checkout/details')
  }

  return (
    <>
      <PageHero
        eyebrow="Secure booking"
        title="Choose your tickets"
        description={`${event.name} · ${event.venue.city}`}
      >
        <Stepper steps={steps} current={0} />
      </PageHero>

      <Container className="grid gap-8 py-12 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          {event.ticketTypes.map((t) => {
            const isSelected = t.key === selectedKey
            const soldOut = t.remaining <= 0 || !t.onSale
            return (
              <GlassCard key={t.id} featured={isSelected} className="p-6">
                <button
                  type="button"
                  disabled={soldOut}
                  onClick={() => setSelectedKey(t.key)}
                  aria-pressed={isSelected}
                  className="flex w-full items-start justify-between gap-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-cream">{t.name}</h3>
                      {t.featured && <Badge tone="gold">Popular</Badge>}
                      {soldOut ? (
                        <Badge tone="danger">Sold out</Badge>
                      ) : (
                        <Badge tone={t.remaining <= 50 ? 'warning' : 'success'}>
                          {t.remaining} left
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ash">{t.tagline}</p>
                    <ul className="mt-3 grid gap-1.5 text-sm text-subtle sm:grid-cols-2">
                      {t.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <Icon
                            name="check"
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="gold-text font-display text-2xl font-extrabold">
                      {formatMoney(t.priceMinor, event.currency)}
                    </span>
                    <span className="block text-xs text-ash">
                      {isGroup
                        ? 'per person'
                        : t.key === 'exclusive'
                          ? 'per table'
                          : 'per person'}
                    </span>
                  </div>
                </button>

                {isSelected && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    {t.groupSizes && (
                      <div className="mb-4">
                        <span className="mb-2 block text-sm font-medium text-cream/90">
                          Group size
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {t.groupSizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setGroupSize(size)}
                              aria-pressed={groupSize === size}
                              className={
                                groupSize === size
                                  ? 'rounded-pill border border-gold/50 bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-bright'
                                  : 'rounded-pill border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-subtle hover:text-cream'
                              }
                            >
                              {size} people
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
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
                  </div>
                )}
              </GlassCard>
            )
          })}
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-cream">Order summary</h2>
            {selected && (
              <p className="mt-1 text-sm text-ash">
                {selected.name}
                {isGroup && groupSize ? ` · ${groupSize} people` : ''}
              </p>
            )}

            <div className="mt-5">
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
                  <span className="text-sm font-semibold text-gold-bright">
                    {appliedPromo} applied
                  </span>
                  <button
                    type="button"
                    onClick={removePromo}
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
                  <Button
                    type="button"
                    variant="glass"
                    onClick={applyPromo}
                    disabled={!promoInput.trim()}
                  >
                    Apply
                  </Button>
                </div>
              )}
              {promoError && (
                <p role="alert" className="mt-2 text-xs text-red-300">
                  {promoError}
                </p>
              )}
            </div>

            <div className="mt-5 min-h-[120px]">
              {quoteError ? (
                <p role="alert" className="text-sm text-red-300">
                  {quoteError}
                </p>
              ) : !quote || !selected ? (
                <p className="text-sm text-subtle">Select a ticket to see your total.</p>
              ) : (
                <>
                  <ul className="space-y-2.5 text-sm">
                    {quote.lines.map((line) => (
                      <li
                        key={line.label}
                        className="flex justify-between gap-4 text-subtle"
                      >
                        <span>{line.label}</span>
                        <span className="text-cream">
                          {formatMoney(line.amountMinor, event.currency)}
                        </span>
                      </li>
                    ))}
                    <li className="flex justify-between gap-4 text-subtle">
                      <span>Subtotal</span>
                      <span className="text-cream">
                        {formatMoney(quote.subtotalMinor, event.currency)}
                      </span>
                    </li>
                    {quote.discountMinor > 0 && (
                      <li className="flex justify-between gap-4 text-emerald-300">
                        <span>Discount{quote.promo ? ` (${quote.promo.code})` : ''}</span>
                        <span>
                          −{formatMoney(quote.discountMinor, event.currency)}
                        </span>
                      </li>
                    )}
                    <li className="flex justify-between gap-4 text-subtle">
                      <span>Booking fee</span>
                      <span className="text-cream">
                        {quote.feeMinor === 0
                          ? 'Free'
                          : formatMoney(quote.feeMinor, event.currency)}
                      </span>
                    </li>
                  </ul>
                  <div className="mt-4 flex justify-between border-t border-white/10 pt-4">
                    <span className="font-semibold text-cream">Total</span>
                    <span className="gold-text font-display text-2xl font-extrabold">
                      {formatMoney(quote.totalMinor, event.currency)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ash">{quote.feesNote}</p>
                </>
              )}
            </div>

            <Button
              className="mt-5"
              size="lg"
              fullWidth
              disabled={!quote || loadingQuote || !quote.available}
              onClick={continueToDetails}
            >
              {loadingQuote ? 'Checking availability…' : 'Continue to details'}
              <Icon name="arrowRight" className="h-4 w-4" />
            </Button>
            {quote && !quote.available && (
              <p className="mt-2 text-xs text-red-300">
                Not enough tickets remaining for this selection.
              </p>
            )}
          </GlassCard>
        </div>
      </Container>
    </>
  )
}
