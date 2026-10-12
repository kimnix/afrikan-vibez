import { useState } from 'react'
import { subscribeNewsletter } from '../../lib/api'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'submitting') return
    setStatus('submitting')
    setMessage('')
    try {
      await subscribeNewsletter({ email, consent, source: 'footer' })
      setStatus('success')
      setMessage('You are on the list. Check your inbox — you can unsubscribe any time.')
      setEmail('')
      setConsent(false)
    } catch (err) {
      setStatus('error')
      setMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again in a moment.',
      )
    }
  }

  return (
    <div className="glass-strong rounded-card p-8 sm:p-10">
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
            <Icon name="mail" className="h-6 w-6" />
          </span>
          <h2 className="mt-5 text-3xl font-bold text-cream">
            Never miss an event
          </h2>
          <p className="mt-3 text-subtle">
            Join the African Vibes newsletter for line-up announcements, presales
            and community news. Unsubscribe any time.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="newsletter-email"
              className="mb-1.5 block text-sm font-medium text-cream/90"
            >
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
            />
          </div>
          <label className="flex items-start gap-3 text-sm text-subtle">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#e7c36a]"
            />
            <span>
              I agree to receive marketing emails and have read the{' '}
              <a href="/privacy" className="text-gold underline-offset-2 hover:underline">
                privacy policy
              </a>
              .
            </span>
          </label>
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={!email || !consent || status === 'submitting'}
          >
            {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
          </Button>
          {message && (
            <p
              role="status"
              aria-live="polite"
              className={
                status === 'success'
                  ? 'text-sm text-emerald-300'
                  : 'text-sm text-amber-300'
              }
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
