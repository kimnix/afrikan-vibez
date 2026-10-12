import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon, type IconName } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { Section } from '../components/ui/Section'

interface Experience {
  id: string
  icon: IconName
  title: string
  body: string
  points: string[]
}

const experiences: Experience[] = [
  {
    id: 'football',
    icon: 'ball',
    title: 'Live Football',
    body: 'The roar of the crowd, big screens and a community that lives for the game.',
    points: [
      'Live matches on stadium-grade screens',
      'Pre-match build-up and analysis',
      'Fan zones and friendly rivalry',
    ],
  },
  {
    id: 'culture',
    icon: 'mask',
    title: 'African Culture',
    body: 'Food, fashion, art and heritage celebrated across the whole venue.',
    points: [
      'Traditional dance and drumming',
      'Designer and streetwear showcases',
      'Artisan food and drink stalls',
    ],
  },
  {
    id: 'music',
    icon: 'music',
    title: 'Top DJs & Artists',
    body: 'Afrobeats, Amapiano and live performances from day into night.',
    points: [
      'Headline live acts',
      'Resident and guest selectors',
      'Sessions running all day',
    ],
  },
  {
    id: 'party',
    icon: 'sparkle',
    title: 'Night Party',
    body: 'When the lights go down, the party goes all the way up.',
    points: [
      'Late-night party programme (18+)',
      'Premium bars and VIP areas',
      'A production built for the moment',
    ],
  },
]

export function ExperiencePage() {
  return (
    <>
      <PageHero
        eyebrow="The experience"
        title="Four worlds, one night"
        description="Every part of African Vibes is designed to be felt — from the first whistle to the last track."
      />

      {experiences.map((exp, index) => (
        <Section key={exp.id} id={exp.id}>
          <div
            className={`grid items-center gap-10 lg:grid-cols-2 ${
              index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
            }`}
          >
            <div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
                <Icon name={exp.icon} className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-3xl font-bold text-cream sm:text-4xl">
                {exp.title}
              </h2>
              <p className="mt-4 text-subtle">{exp.body}</p>
              <ul className="mt-6 space-y-3">
                {exp.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-cream/90">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="photo kente relative aspect-[4/3] overflow-hidden rounded-card border border-white/12">
              <Icon
                name={exp.icon}
                className="absolute right-6 top-6 h-10 w-10 text-gold/70"
              />
            </div>
          </div>
        </Section>
      ))}

      <Section>
        <GlassCard featured className="p-10 text-center">
          <h2 className="text-3xl font-bold text-cream">
            Experience it live
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-subtle">
            Tickets for the next African Vibes event are available now.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button to="/tickets" size="lg">
              Get Your Ticket
            </Button>
            <Button to="/gallery" variant="glass" size="lg">
              View gallery
            </Button>
          </div>
        </GlassCard>
      </Section>
    </>
  )
}
