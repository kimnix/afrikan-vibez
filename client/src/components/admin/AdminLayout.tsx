import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { Button } from '../ui/Button'
import { Container } from '../ui/Container'

const links = [
  { label: 'Overview', to: '/admin', end: true },
  { label: 'Events', to: '/admin/events', end: false },
  { label: 'Bookings', to: '/admin/bookings', end: false },
  { label: 'Promos', to: '/admin/promos', end: false },
  { label: 'Gallery', to: '/admin/gallery', end: false },
  { label: 'Subscribers', to: '/admin/subscribers', end: false },
  { label: 'Reports', to: '/admin/reports', end: false },
]

export function AdminLayout() {
  const { user, status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60svh] items-center justify-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-gold"
          role="status"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to={user ? '/' : '/account'} replace />
  }

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold">Admin</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-cream">
            Control room
          </h1>
        </div>
        <Button to="/events" variant="glass" size="sm">
          View public site
        </Button>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive
                ? 'rounded-xl bg-gold/15 px-4 py-2 text-sm font-semibold text-gold-bright'
                : 'rounded-xl px-4 py-2 text-sm font-medium text-subtle hover:bg-white/[0.05] hover:text-cream'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </Container>
  )
}
