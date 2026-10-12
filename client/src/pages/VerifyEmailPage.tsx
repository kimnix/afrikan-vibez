import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { useAuth } from '../auth/AuthContext'
import { ApiError, verifyEmail } from '../lib/api'

type Status = 'verifying' | 'success' | 'error'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, refresh } = useAuth()

  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!token) {
      setStatus('error')
      setMessage('This verification link is missing its token.')
      return
    }
    verifyEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Your email address is verified. You are all set.')
        if (user) void refresh()
      })
      .catch((err: unknown) => {
        setStatus('error')
        setMessage(
          err instanceof ApiError
            ? err.message
            : 'We could not verify this link. It may have expired.',
        )
      })
  }, [token, user, refresh])

  return (
    <Container className="py-16">
      <GlassCard className="mx-auto max-w-lg p-8 text-center">
        {status === 'verifying' && (
          <>
            <div
              className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
              role="status"
              aria-label="Verifying"
            />
            <h1 className="mt-4 font-display text-2xl font-bold text-cream">
              Verifying your email…
            </h1>
          </>
        )}

        {status === 'success' && (
          <>
            <Icon name="check" className="mx-auto h-10 w-10 text-emerald-300" />
            <h1 className="mt-4 font-display text-2xl font-bold text-cream">
              Email verified
            </h1>
            <p role="status" className="mt-2 text-sm text-subtle">{message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button to="/events">Browse events</Button>
              <Button to="/account" variant="glass">
                My account
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <Icon name="info" className="mx-auto h-10 w-10 text-amber-300" />
            <h1 className="mt-4 font-display text-2xl font-bold text-cream">
              Verification failed
            </h1>
            <p role="alert" className="mt-2 text-sm text-subtle">{message}</p>
            <p className="mt-4 text-sm text-subtle">
              You can request a new link from your{' '}
              <Link to="/account" className="text-gold hover:underline">
                account page
              </Link>
              .
            </p>
          </>
        )}
      </GlassCard>
    </Container>
  )
}
