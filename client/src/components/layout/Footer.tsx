import { Link } from 'react-router-dom'
import { site } from '../../data/site'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { Brand } from './Brand'
import { navItems } from './nav'

const supportLinks = [
  { label: 'My Tickets', to: '/my-tickets' },
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
]

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-ink/60">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Brand />
          <p className="mt-4 max-w-sm text-sm text-subtle">
            One unique celebration of African culture, football, music and unity.
            One event. One community.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {site.social.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-cream/85 transition hover:border-gold/40 hover:text-gold-bright"
              >
                {s.label}
                <Icon name="external" className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="Explore">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Explore
          </h3>
          <ul className="space-y-2.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-subtle transition hover:text-cream"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Support">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Support
          </h3>
          <ul className="space-y-2.5">
            {supportLinks.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-subtle transition hover:text-cream"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${site.email}`}
                className="text-sm text-subtle transition hover:text-cream"
              >
                {site.email}
              </a>
            </li>
          </ul>
        </nav>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-ash sm:flex-row">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <Icon name="lock" className="h-3.5 w-3.5 text-gold" />
            Secure payments powered by Stripe
          </p>
        </Container>
      </div>
    </footer>
  )
}
