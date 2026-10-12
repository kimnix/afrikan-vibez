import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'
import { Icon } from '../ui/Icon'
import { Brand } from './Brand'
import { navItems } from './nav'

function DesktopLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'relative rounded-lg px-3 py-2 text-sm font-medium transition',
          isActive ? 'text-gold-bright' : 'text-cream/80 hover:text-cream',
        )
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gold" />
          )}
        </>
      )}
    </NavLink>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { user } = useAuth()
  const accountLabel = user ? user.firstName : 'Sign in'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu on navigation.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Close on Escape and lock scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition duration-300',
        scrolled
          ? 'border-b border-white/10 bg-ink/80 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <Container className="flex h-18 items-center justify-between gap-4 py-3">
        <Brand />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <DesktopLink key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/my-tickets"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-cream/80 transition hover:text-cream"
          >
            <Icon name="ticket" className="h-4 w-4" />
            My Tickets
          </Link>
          <Button to="/account" size="sm">
            <Icon name="user" className="h-4 w-4" />
            {accountLabel}
          </Button>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] p-2.5 text-cream lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} className="h-5 w-5" />
        </button>
      </Container>

      <div
        id="mobile-menu"
        hidden={!open}
        className="lg:hidden"
      >
        <div className="border-t border-white/10 bg-ink/95 backdrop-blur-xl">
          <Container className="flex flex-col gap-1 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-4 py-3 text-base font-medium transition',
                    isActive
                      ? 'bg-white/[0.06] text-gold-bright'
                      : 'text-cream/85 hover:bg-white/[0.05]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button to="/my-tickets" variant="glass" size="md">
                <Icon name="ticket" className="h-4 w-4" />
                My Tickets
              </Button>
              <Button to="/account" size="md">
                <Icon name="user" className="h-4 w-4" />
                {accountLabel}
              </Button>
            </div>
          </Container>
        </div>
      </div>
    </header>
  )
}
