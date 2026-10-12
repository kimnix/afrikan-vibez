import type { Category } from '../../types'
import { GlassCard } from '../ui/GlassCard'
import { Icon, type IconName } from '../ui/Icon'

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => (
        <GlassCard
          key={category.key}
          to={category.href}
          className="group p-6"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
            <Icon name={category.icon as IconName} className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-bold text-cream">{category.title}</h3>
          <p className="mt-2 text-sm text-subtle">{category.blurb}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold transition group-hover:gap-2.5">
            Explore
            <Icon name="arrowRight" className="h-4 w-4" />
          </span>
        </GlassCard>
      ))}
    </div>
  )
}
