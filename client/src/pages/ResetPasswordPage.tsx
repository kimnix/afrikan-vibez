import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ApiError, resetPassword } from '../lib/api'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetPassword({ token, password })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset your password.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <Container className="py-16">
        <GlassCard className="mx-auto max-w-md p-8 text-center">
          <Icon name="info" className="mx-auto h-10 w-10 text-amber-300" />
          <h1 className="mt-4 font-display text-2xl font-bold text-cream">
            Invalid reset link
          </h1>
          <p className="mt-2 text-sm text-subtle">
            This reset link is missing its token. Request a new one from the sign-in page.
          </p>
          <div className="mt-6">
            <Button to="/forgot-password">Request a new link</Button>
          </div>
        </GlassCard>
      </Container>
    )
  }

  return (
    <Container className="py-16">
      <GlassCard className="mx-auto max-w-md p-8">
        <h1 className="font-display text-2xl font-bold text-cream">Choose a new password</h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <p
              role="status"
              className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
            >
              Your password has been updated. You can now sign in.
            </p>
            <Button to="/account" fullWidth>
              Sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">
                New password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">
                Confirm password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? 'Saving…' : 'Set new password'}
            </Button>
          </form>
        )}
      </GlassCard>
    </Container>
  )
}
