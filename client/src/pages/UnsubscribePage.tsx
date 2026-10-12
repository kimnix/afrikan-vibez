import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { ApiError, unsubscribeNewsletter } from '../lib/api'

type Status = 'idle' | 'busy' | 'done' | 'error'

export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  async function confirm() {
    setStatus('busy')
    setMessage('')
    try {
      await unsubscribeNewsletter(token)
      setStatus('done')
      setMessage('You have been removed from the African Vibes newsletter.')
    } catch (err) {
      setStatus('error')
      setMessage(
        err instanceof ApiError ? err.message : 'We could not process this unsubscribe link.',
      )
    }
  }

  return (
    <Container className="py-16">
      <GlassCard className="mx-auto max-w-md p-8 text-center">
        {!token && (
          <>
            <Icon name="info" className="mx-auto h-10 w-10 text-amber-300" />
            <h1 className="mt-4 font-display text-2xl font-bold text-cream">
              Invalid unsubscribe link
            </h1>
            <p className="mt-2 text-sm text-subtle">
              This link is missing its token. Use the unsubscribe link from a recent email.
            </p>
          </>
        )}

        {token && status === 'done' && (
          <>
            <Icon name="check" className="mx-auto h-10 w-10 text-emerald-300" />
            <h1 className="mt-4 font-display text-2xl font-bold text-cream">Unsubscribed</h1>
            <p className="mt-2 text-sm text-subtle">{message}</p>
            <div className="mt-6">
              <Button to="/">Back to home</Button>
            </div>
          </>
        )}

        {token && (status === 'idle' || status === 'busy' || status === 'error') && (
          <>
            <Icon name="mail" className="mx-auto h-10 w-10 text-gold" />
            <h1 className="mt-4 font-display text-2xl font-bold text-cream">
              Leave the newsletter?
            </h1>
            <p className="mt-2 text-sm text-subtle">
              You will stop receiving event announcements and presale news.
            </p>
            {status === 'error' && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {message}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={confirm} variant="danger" disabled={status === 'busy'}>
                {status === 'busy' ? 'Unsubscribing…' : 'Confirm unsubscribe'}
              </Button>
              <Button to="/" variant="ghost">
                Keep me subscribed
              </Button>
            </div>
          </>
        )}
      </GlassCard>
    </Container>
  )
}
