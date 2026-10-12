import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { Icon } from '../ui/Icon'

export interface Step {
  label: string
  to: string
}

export function Stepper({
  steps,
  current,
}: {
  steps: Step[]
  current: number
}) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {steps.map((step, index) => {
          const isComplete = index < current
          const isActive = index === current
          const content = (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                  isComplete && 'border-gold bg-gold text-ink',
                  isActive && 'border-gold text-gold',
                  !isComplete && !isActive && 'border-white/20 text-ash',
                )}
              >
                {isComplete ? <Icon name="check" className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-cream' : 'text-ash',
                )}
              >
                {step.label}
              </span>
            </>
          )

          return (
            <li key={step.to} className="flex items-center gap-2">
              {isComplete ? (
                <Link
                  to={step.to}
                  className="flex items-center gap-2 rounded-lg px-1 py-1 hover:opacity-90"
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className="flex items-center gap-2 px-1 py-1"
                >
                  {content}
                </span>
              )}
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden h-px w-8 bg-white/15 sm:block"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
