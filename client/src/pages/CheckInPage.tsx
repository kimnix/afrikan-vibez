import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { QrScanner } from '../components/tickets/QrScanner'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { ApiError, checkInTicket, validateTicket } from '../lib/api'
import { formatEventDate, formatEventTime } from '../lib/format'
import type { TicketScanResult, TicketScanStatus } from '../types'

const statusMeta: Record<
  TicketScanStatus,
  { tone: 'success' | 'warning' | 'danger' | 'neutral'; title: string; note: string }
> = {
  valid: {
    tone: 'success',
    title: 'Valid ticket',
    note: 'This ticket is ready to be checked in.',
  },
  already_checked_in: {
    tone: 'warning',
    title: 'Already checked in',
    note: 'This ticket has already been used at the gate.',
  },
  not_found: {
    tone: 'danger',
    title: 'Ticket not found',
    note: 'This code is not recognised. Do not admit entry.',
  },
  not_paid: {
    tone: 'danger',
    title: 'Booking not paid',
    note: 'This booking was not completed. Do not admit entry.',
  },
}

export function CheckInPage() {
  const { user, status, accessToken } = useAuth()

  const [code, setCode] = useState('')
  const [result, setResult] = useState<TicketScanResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const run = useCallback(
    async (action: 'validate' | 'check-in', raw: string) => {
      const value = raw.trim()
      if (!accessToken || value.length < 4) return
      setBusy(true)
      setError(null)
      try {
        const res =
          action === 'check-in'
            ? await checkInTicket(value, accessToken)
            : await validateTicket(value, accessToken)
        setResult(res)
        setCode(value)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Scan failed. Please try again.')
      } finally {
        setBusy(false)
      }
    },
    [accessToken],
  )

  const onDetect = useCallback(
    (value: string) => {
      void run('validate', value)
    },
    [run],
  )

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/account" replace />
  }

  const allowed = user.role === 'admin' || user.role === 'staff'
  if (!allowed) {
    return (
      <>
        <PageHero eyebrow="Staff" title="Ticket check-in" description="Restricted area." />
        <Container className="py-12">
          <GlassCard className="mx-auto max-w-lg p-8 text-center">
            <Icon name="lock" className="mx-auto h-10 w-10 text-gold" />
            <h1 className="mt-4 text-xl font-bold text-cream">Staff access only</h1>
            <p className="mt-2 text-sm text-subtle">
              This area is for event staff and administrators.
            </p>
            <Button to="/account" variant="glass" className="mt-6">
              Back to account
            </Button>
          </GlassCard>
        </Container>
      </>
    )
  }

  const meta = result ? statusMeta[result.status] : null
  const scan = result?.scan ?? null

  return (
    <>
      <PageHero
        eyebrow="Staff"
        title="Ticket check-in"
        description="Scan a QR code or enter a ticket code to validate entry."
      />

      <Container className="grid gap-8 py-12 lg:grid-cols-2">
        <GlassCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-cream">Scan</h2>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setScanning((s) => !s)}
            >
              <Icon name="qr" className="h-4 w-4" />
              {scanning ? 'Stop camera' : 'Use camera'}
            </Button>
          </div>

          {scanning && (
            <div className="mt-5">
              <QrScanner onDetect={onDetect} active={scanning} />
            </div>
          )}

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void run('validate', code)
            }}
          >
            <label htmlFor="ticket-code" className="block text-sm font-medium text-cream/90">
              Ticket code
            </label>
            <input
              id="ticket-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste or type the code"
              autoComplete="off"
              className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 font-mono text-sm text-cream placeholder:text-ash/70 focus:border-gold focus:outline-none"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="glass" disabled={busy || !code.trim()}>
                Validate
              </Button>
              <Button
                type="button"
                disabled={busy || !code.trim()}
                onClick={() => void run('check-in', code)}
              >
                <Icon name="check" className="h-4 w-4" />
                Check in
              </Button>
            </div>
          </form>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          )}
        </GlassCard>

        <GlassCard className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-cream">Result</h2>
          {!meta ? (
            <p className="mt-4 text-sm text-subtle">
              Scan or enter a ticket code to see its status.
            </p>
          ) : (
            <>
              <div className="mt-4">
                <Badge tone={meta.tone}>{meta.title}</Badge>
                <p className="mt-2 text-sm text-subtle">{meta.note}</p>
              </div>

              {scan && (
                <dl className="mt-6 space-y-3 text-sm">
                  <Detail label="Attendee" value={scan.attendeeName} />
                  <Detail label="Ticket type" value={scan.ticketTypeName} />
                  <Detail label="Event" value={scan.eventName} />
                  {scan.eventStartAt && (
                    <Detail
                      label="Date"
                      value={`${formatEventDate(scan.eventStartAt, scan.eventTimezone)} · ${formatEventTime(
                        scan.eventStartAt,
                        scan.eventTimezone,
                      )}`}
                    />
                  )}
                  {scan.venueName && <Detail label="Venue" value={scan.venueName} />}
                  <Detail label="Reference" value={scan.bookingReference} mono />
                  {scan.checkedInAt && (
                    <Detail
                      label="Checked in"
                      value={new Date(scan.checkedInAt).toLocaleString('en-GB')}
                    />
                  )}
                </dl>
              )}
            </>
          )}
        </GlassCard>
      </Container>
    </>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/10 pb-2.5">
      <dt className="text-ash">{label}</dt>
      <dd className={`text-right font-medium text-cream ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
