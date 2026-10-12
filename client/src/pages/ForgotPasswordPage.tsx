import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { ApiError, requestPasswordReset } from '../lib/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Container className="py-16">
      <GlassCard className="mx-auto max-w-md p-8">
        <h1 className="font-display text-2xl font-bold text-cream">Reset your password</h1>
        <p className="mt-2 text-sm text-subtle">
          Enter the email on your account and we will send you a reset link.
        </p>

        {done ? (
          <div className="mt-6 space-y-4">
            <p
              role="status"
              className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
            >
              If an account exists for {email}, a reset link is on its way.
            </p>
            <Button to="/account" variant="glass" fullWidth>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">
                Email address
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" fullWidth disabled={busy || !email}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
            <p className="text-center text-sm text-subtle">
              Remembered it?{' '}
              <Link to="/account" className="text-gold hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </GlassCard>
    </Container>
  )
}
