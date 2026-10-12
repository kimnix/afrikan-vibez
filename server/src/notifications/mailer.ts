import { env } from '../env.js'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

export interface SendResult {
  /** True when the message was handed to a real provider. */
  delivered: boolean
  /** Provider id when delivered, or the reason it was only logged. */
  detail?: string
}

export function isEmailConfigured(): boolean {
  return env.resendApiKey.length > 0
}

/**
 * Send a transactional email through Resend when `RESEND_API_KEY` is set. With
 * no key (the default local setup) the message is logged to the console so the
 * whole flow is testable without an account. Throws only on a provider error.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!isEmailConfigured()) {
    console.log(
      [
        '',
        '──────── ✉  email (not sent — RESEND_API_KEY unset) ────────',
        `To:      ${message.to}`,
        `From:    ${env.emailFrom}`,
        `Subject: ${message.subject}`,
        '',
        message.text,
        '───────────────────────────────────────────────────────────',
        '',
      ].join('\n'),
    )
    return { delivered: false, detail: 'logged-to-console' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Resend request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const payload = (await res.json().catch(() => ({}))) as { id?: string }
  return { delivered: true, detail: payload.id }
}

/** Fire-and-forget send that never rejects — for flows that must not fail. */
export function sendEmailInBackground(message: EmailMessage): void {
  void sendEmail(message).catch((err) => {
    console.error(`[email] Failed to send "${message.subject}" to ${message.to}:`, err)
  })
}
