export interface NavItem {
  label: string
  to: string
}

/** Primary navigation, mirrored in the mobile menu. */
export const navItems: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Events', to: '/events' },
  { label: 'Tickets', to: '/tickets' },
  { label: 'About', to: '/about' },
  { label: 'Experience', to: '/experience' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
]
