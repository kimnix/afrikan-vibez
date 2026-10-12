import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { Container } from '../components/ui/Container'
import { site } from '../data/site'
import { apiRequest } from '../lib/api'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function ContactPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    setStatus('submitting')
    setMessage('')
    try {
      await apiRequest('/api/contact', { method: 'POST', body: data })
      setStatus('success')
      setMessage('Thanks — your message has been sent.')
      form.reset()
    } catch {
      setStatus('error')
      setMessage(
        'Message delivery is not enabled in this build yet — it arrives with the notifications phase.',
      )
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in touch"
        description="Questions about tickets, group bookings, accessibility or partnerships? We would love to hear from you."
      />

      <Container className="grid gap-8 py-12 lg:grid-cols-[1fr_0.7fr]">
        <GlassCard className="p-6 sm:p-8">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="name" label="Full name" required autoComplete="name" />
              <Field
                id="email"
                label="Email"
                type="email"
                required
                autoComplete="email"
              />
            </div>
            <Field id="subject" label="Subject" required />
            <div>
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium text-cream/90"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
                placeholder="How can we help?"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Sending…' : 'Send message'}
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
        </GlassCard>

        <div className="space-y-5">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-cream">Contact details</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex items-center gap-3 text-subtle hover:text-cream"
                >
                  <Icon name="mail" className="h-4 w-4 text-gold" />
                  {site.email}
                </a>
              </li>
              <li className="inline-flex items-center gap-3 text-subtle">
                <Icon name="info" className="h-4 w-4 text-gold" />
                {site.phone}
              </li>
            </ul>
          </GlassCard>
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-cream">Follow us</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {site.social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-cream/85 hover:border-gold/40 hover:text-gold-bright"
                >
                  {s.label}
                  <Icon name="external" className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </GlassCard>
        </div>
      </Container>
    </>
  )
}

function Field({
  id,
  label,
  type = 'text',
  required,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
  autoComplete?: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-cream/90"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
      />
    </div>
  )
}
