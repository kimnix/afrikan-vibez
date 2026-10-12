import { Icon } from '../ui/Icon'

export function WhyAttend({ reasons }: { reasons: string[] }) {
  return (
    <div className="glass-strong rounded-card grid gap-8 p-8 md:grid-cols-2 md:p-10">
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
          <Icon name="sparkle" className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-3xl font-bold text-cream">
          Why attend?
        </h2>
        <p className="mt-3 text-subtle">
          African Vibes is more than a party — it is where culture, sport and
          community meet.
        </p>
      </div>
      <ul className="space-y-4 self-center">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Icon name="check" className="h-4 w-4" />
            </span>
            <span className="text-cream/90">{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
