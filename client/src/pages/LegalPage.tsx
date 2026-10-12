import { PageHero } from '../components/ui/PageHero'
import { Container } from '../components/ui/Container'

interface Section {
  heading: string
  body: string[]
}

const privacy: Section[] = [
  {
    heading: 'What we collect',
    body: [
      'We collect the information needed to process bookings: your name, email address, purchase details and, where provided, attendee names.',
      'Payment card details are handled entirely by our payment provider. We never store card numbers on our servers.',
    ],
  },
  {
    heading: 'How we use it',
    body: [
      'We use your information to issue tickets, provide customer support, prevent fraud and, with your consent, send event updates.',
      'We do not sell your personal information.',
    ],
  },
  {
    heading: 'Your rights',
    body: [
      'You can request access to, correction of, or deletion of your personal data, and withdraw marketing consent at any time.',
    ],
  },
]

const terms: Section[] = [
  {
    heading: 'Tickets and entry',
    body: [
      'A valid ticket is required for entry. Each QR code is valid for a single scan and admits the named number of guests.',
      'The organiser reserves the right to refuse admission and to search bags on entry.',
    ],
  },
  {
    heading: 'Refunds and cancellations',
    body: [
      'Tickets are refundable up to 7 days before the event unless stated otherwise at checkout. If an event is cancelled, ticket holders receive a refund of the face value.',
    ],
  },
  {
    heading: 'Liability',
    body: [
      'African Vibes is not liable for personal property lost or damaged at an event, except where required by law.',
    ],
  },
]

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const sections = kind === 'privacy' ? privacy : terms
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title={kind === 'privacy' ? 'Privacy policy' : 'Terms of service'}
        description="This is a template and should be reviewed by a qualified professional before launch."
      />
      <Container className="max-w-3xl py-12">
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-bold text-cream">{s.heading}</h2>
              <div className="mt-3 space-y-3 text-subtle">
                {s.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm text-ash">
          Last updated: {new Date().toLocaleDateString('en-GB')}
        </p>
      </Container>
    </>
  )
}
