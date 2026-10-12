import type { BookingDetail } from '../domain/types.js'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

function formatEventDate(iso: string, timezone: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(date)
  } catch {
    return date.toUTCString()
  }
}

/** Shared dark/gold wrapper matching the app's visual identity. */
function layout(heading: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#0b0a12;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f4f1ea;">
    <div style="max-width:560px;margin:0 auto;background:#15121f;border:1px solid rgba(231,195,106,0.25);border-radius:18px;overflow:hidden;">
      <div style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <span style="font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#e7c36a;font-weight:700;">African Vibes</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:22px;color:#f4f1ea;">${heading}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#8b8798;">
        African Vibes — events, culture and nightlife.
      </div>
    </div>
  </body>
</html>`
}

function button(label: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#e7c36a;color:#1a1408;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:12px;">${label}</a></p>`
}

export function renderBookingConfirmation(booking: BookingDetail): RenderedEmail {
  const when = formatEventDate(booking.eventStartAt, booking.eventTimezone)
  const ticketLines = booking.tickets
    .map((t, i) => `  ${i + 1}. ${t.fullName} — code ${t.ticketCode}`)
    .join('\n')

  const rows = booking.tickets
    .map(
      (t) =>
        `<tr><td style="padding:6px 0;color:#c9c5d2;">${escapeHtml(t.fullName)}</td><td style="padding:6px 0;text-align:right;font-family:monospace;color:#f4f1ea;">${escapeHtml(t.ticketCode)}</td></tr>`,
    )
    .join('')

  const html = layout(
    `You're going to ${escapeHtml(booking.eventName)}!`,
    `<p style="margin:0 0 16px;color:#c9c5d2;">Hi ${escapeHtml(booking.purchaser.firstName)}, your payment is confirmed. Here are your tickets.</p>
     <p style="margin:0;color:#c9c5d2;"><strong style="color:#f4f1ea;">Reference:</strong> ${escapeHtml(booking.reference)}</p>
     <p style="margin:6px 0 0;color:#c9c5d2;"><strong style="color:#f4f1ea;">When:</strong> ${escapeHtml(when)}</p>
     <p style="margin:6px 0 0;color:#c9c5d2;"><strong style="color:#f4f1ea;">Where:</strong> ${escapeHtml(booking.venueName)}</p>
     <p style="margin:6px 0 0;color:#c9c5d2;"><strong style="color:#f4f1ea;">Total paid:</strong> ${escapeHtml(formatMoney(booking.totalMinor, booking.currency))}</p>
     <table style="width:100%;border-collapse:collapse;margin-top:20px;">${rows}</table>
     ${button('View your tickets', `${bookingTicketsUrl(booking.reference)}`)}
     <p style="margin:0;font-size:12px;color:#8b8798;">Bring the QR codes to the door — each one is scanned once.</p>`,
  )

  return {
    subject: `Your African Vibes tickets — ${booking.eventName} (${booking.reference})`,
    html,
    text: `You're going to ${booking.eventName}!\n\nReference: ${booking.reference}\nWhen: ${when}\nWhere: ${booking.venueName}\nTotal paid: ${formatMoney(booking.totalMinor, booking.currency)}\n\nTickets:\n${ticketLines}\n\nView your tickets: ${bookingTicketsUrl(booking.reference)}\n`,
  }
}

function bookingTicketsUrl(reference: string): string {
  const base = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
  return `${base.replace(/\/$/, '')}/my-tickets/${encodeURIComponent(reference)}`
}

export function renderVerifyEmail(params: { firstName: string; url: string }): RenderedEmail {
  const html = layout(
    'Confirm your email',
    `<p style="margin:0 0 16px;color:#c9c5d2;">Hi ${escapeHtml(params.firstName)}, welcome to African Vibes. Confirm your email address to secure your account.</p>
     ${button('Confirm my email', params.url)}
     <p style="margin:0;font-size:12px;color:#8b8798;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>`,
  )
  return {
    subject: 'Confirm your African Vibes email',
    html,
    text: `Hi ${params.firstName}, confirm your email address: ${params.url}\n\nThis link expires in 24 hours.`,
  }
}

export function renderPasswordReset(params: { firstName: string; url: string }): RenderedEmail {
  const html = layout(
    'Reset your password',
    `<p style="margin:0 0 16px;color:#c9c5d2;">Hi ${escapeHtml(params.firstName)}, we received a request to reset your African Vibes password.</p>
     ${button('Choose a new password', params.url)}
     <p style="margin:0;font-size:12px;color:#8b8798;">This link expires in 1 hour. If you didn't request this, no action is needed.</p>`,
  )
  return {
    subject: 'Reset your African Vibes password',
    html,
    text: `Hi ${params.firstName}, reset your password: ${params.url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  }
}

export function renderNewsletterWelcome(params: {
  unsubscribeUrl: string
}): RenderedEmail {
  const html = layout(
    'You are on the list',
    `<p style="margin:0 0 16px;color:#c9c5d2;">Thanks for joining the African Vibes newsletter. You'll hear about line-up announcements, presales and community news first.</p>
     <p style="margin:0;font-size:12px;color:#8b8798;">Changed your mind? <a href="${params.unsubscribeUrl}" style="color:#e7c36a;">Unsubscribe</a>.</p>`,
  )
  return {
    subject: 'Welcome to the African Vibes newsletter',
    html,
    text: `Thanks for joining the African Vibes newsletter. Unsubscribe any time: ${params.unsubscribeUrl}`,
  }
}
