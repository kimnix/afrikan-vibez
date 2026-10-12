import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { ApiError, resendVerification } from '../lib/api'

const benefits = [
  'Your bookings in one place',
  'Retrieve QR tickets any time',
  'Faster checkout with saved details',
  'Event news and presales (optional)',
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AccountPage() {
  const { user, status, accessToken, signIn, signUp, signOut } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null)

  async function resendEmail() {
    if (!accessToken) return
    setResending(true)
    setVerifyMsg(null)
    try {
      await resendVerification(accessToken)
      setVerifyMsg('Verification email sent. Check your inbox.')
    } catch (err) {
      setVerifyMsg(
        err instanceof ApiError ? err.message : 'Could not resend the verification email.',
      )
    } finally {
      setResending(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading account"
        />
      </div>
    )
  }

  if (status === 'authenticated' && user) {
    return (
      <>
        <PageHero
          eyebrow="Account"
          title={`Welcome back, ${user.firstName}`}
          description="Manage your details and access your tickets."
        />
        {!user.emailVerified && (
          <Container className="pt-8">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-amber-400/30 bg-amber-400/10 px-5 py-4">
              <div className="flex items-start gap-3">
                <Icon name="mail" className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div>
                  <p className="text-sm font-semibold text-amber-100">
                    Verify your email address
                  </p>
                  <p className="text-sm text-subtle">
                    {verifyMsg ??
                      'Confirm your email to secure your account and recover your bookings.'}
                  </p>
                </div>
              </div>
              <Button
                variant="glass"
                size="sm"
                onClick={resendEmail}
                disabled={resending}
              >
                {resending ? 'Sending…' : 'Resend email'}
              </Button>
            </div>
          </Container>
        )}
        <Container className="grid gap-8 py-12 lg:grid-cols-[1.2fr_0.8fr]">
          <GlassCard className="p-8">
            <h2 className="text-xl font-bold text-cream">Your details</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <Row label="Name" value={`${user.firstName} ${user.lastName}`} />
              <Row label="Email" value={user.email} />
              {user.phone && <Row label="Phone" value={user.phone} />}
              <Row
                label="Member since"
                value={new Date(user.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/my-tickets">
                <Icon name="ticket" className="h-4 w-4" />
                My tickets
              </Button>
              {(user.role === 'admin' || user.role === 'staff') && (
                <Button to="/admin/check-in" variant="glass">
                  <Icon name="qr" className="h-4 w-4" />
                  Staff check-in
                </Button>
              )}
              <Button variant="glass" onClick={signOut}>
                Sign out
              </Button>
            </div>
          </GlassCard>

          <GlassCard featured className="flex flex-col justify-center p-8">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
              <Icon name="shield" className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-cream">You're signed in</h2>
            <p className="mt-2 text-sm text-subtle">
              Your bookings and QR tickets are always available in My Tickets,
              ready to scan at the gate.
            </p>
          </GlassCard>
        </Container>
      </>
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (mode === 'register' && (!firstName.trim() || !lastName.trim())) {
      setError('Enter your first and last name.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn({ email: email.trim(), password })
      } else {
        await signUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          marketingOptIn,
        })
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Account"
        title={mode === 'login' ? 'Welcome back' : 'Create your account'}
        description="An account lets you track bookings, retrieve QR tickets and manage your details."
      />

      <Container className="grid gap-8 py-12 lg:grid-cols-2">
        <GlassCard className="p-8">
          <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError(null)
                }}
                className={
                  mode === m
                    ? 'rounded-lg bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-bright'
                    : 'rounded-lg px-4 py-2 text-sm font-medium text-subtle hover:text-cream'
                }
              >
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {mode === 'register' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="firstName"
                  label="First name"
                  value={firstName}
                  autoComplete="given-name"
                  onChange={setFirstName}
                />
                <Field
                  id="lastName"
                  label="Last name"
                  value={lastName}
                  autoComplete="family-name"
                  onChange={setLastName}
                />
              </div>
            )}

            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={setEmail}
            />

            <Field
              id="password"
              label="Password"
              type="password"
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={setPassword}
            />

            {mode === 'login' && (
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-gold underline-offset-2 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {mode === 'register' && (
              <label className="flex items-start gap-3 text-sm text-subtle">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#e7c36a]"
                />
                <span>Send me event news and presales. I can unsubscribe any time.</span>
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" fullWidth disabled={busy}>
              {busy ? (
                'Please wait…'
              ) : mode === 'login' ? (
                <>
                  <Icon name="lock" className="h-4 w-4" />
                  Sign in
                </>
              ) : (
                <>
                  <Icon name="user" className="h-4 w-4" />
                  Create account
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-xs text-ash">
            By continuing you agree to our{' '}
            <a href="/terms" className="text-gold underline-offset-2 hover:underline">
              terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-gold underline-offset-2 hover:underline">
              privacy policy
            </a>
            .
          </p>
        </GlassCard>

        <GlassCard className="flex flex-col justify-center p-8">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold">
            <Icon name="shield" className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-2xl font-bold text-cream">Why create an account?</h2>
          <ul className="mt-6 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-cream/90">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-subtle">
            Prefer not to sign up? You can still check out as a guest, then
            claim your tickets in My Tickets once you create an account.
          </p>
        </GlassCard>
      </Container>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
      <dt className="text-ash">{label}</dt>
      <dd className="text-right font-medium text-cream">{value}</dd>
    </div>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
}) {
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
      />
    </div>
  )
}
