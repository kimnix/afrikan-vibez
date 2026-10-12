import type { Highlight } from '../../types'
import { GlassCard } from '../ui/GlassCard'
import { Icon, type IconName } from '../ui/Icon'

export function EventHighlights({ highlights }: { highlights: Highlight[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {highlights.map((item) => (
        <GlassCard key={item.title} className="p-6">
          <Icon
            name={item.icon as IconName}
            className="h-7 w-7 text-gold"
          />
          <h3 className="mt-4 text-base font-bold text-cream">{item.title}</h3>
          <p className="mt-2 text-sm text-subtle">{item.description}</p>
        </GlassCard>
      ))}
    </div>
  )
}
