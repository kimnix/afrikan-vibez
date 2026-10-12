import { Button } from '../components/ui/Button'
import { GlassCard } from '../components/ui/GlassCard'
import { Icon, type IconName } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { Section } from '../components/ui/Section'
import { SectionHeading } from '../components/ui/SectionHeading'

const values: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'mask',
    title: 'Culture first',
    body: 'We champion African heritage, art, food and fashion — on and off the pitch.',
  },
  {
    icon: 'users',
    title: 'Community',
    body: 'African Vibes is a place to meet, connect and celebrate together.',
  },
  {
    icon: 'shield',
    title: 'Trust',
    body: 'Secure payments, transparent pricing and reliable entry for every guest.',
  },
]

export function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="About African Vibes"
        description="One unique celebration of African culture, football, music and unity. One event. One community."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our story" title="More than an event" />
            <div className="space-y-4 text-subtle">
              <p>
                African Vibes began with a simple idea: bring the energy of
                African football, music and culture together under one roof for
                one unforgettable day and night.
              </p>
              <p>
                From the roar of a live match to the first drop of an Amapiano
                set, we design every detail to feel premium, welcoming and
                authentically ours.
              </p>
              <p>
                Whether you come for the football, the food, the fashion or the
                party, you leave with new friends and a community to come back
                to.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/events">See our events</Button>
              <Button to="/contact" variant="glass">
                Get in touch
              </Button>
            </div>
          </div>

          <div className="photo kente relative aspect-[4/5] overflow-hidden rounded-card border border-white/12">
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="font-display text-2xl font-extrabold uppercase text-cream">
                Football. Culture. Music. Night Party.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="What we stand for" title="Our values" />
        <div className="grid gap-5 sm:grid-cols-3">
          {values.map((v) => (
            <GlassCard key={v.title} className="p-6">
              <Icon name={v.icon} className="h-7 w-7 text-gold" />
              <h3 className="mt-4 text-lg font-bold text-cream">{v.title}</h3>
              <p className="mt-2 text-sm text-subtle">{v.body}</p>
            </GlassCard>
          ))}
        </div>
      </Section>
    </>
  )
}
