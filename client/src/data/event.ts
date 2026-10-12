import type { EventDetail } from '../types'

/**
 * Seed featured event.
 *
 * This is the development fallback used when the API is unavailable. In
 * later phases the same shape is served from the database and editable in the
 * admin dashboard. Dates are stored as absolute instants; the `timezone` field
 * controls how they are displayed and when the countdown ends.
 */
export const featuredEvent: EventDetail = {
  id: 'evt_african_vibes_2027',
  slug: 'african-vibes-2027',
  name: 'African Vibes',
  tagline: 'Culture • Football • Music • Night Party',
  headline: 'Football. Culture. Music. Night Party.',
  summary:
    'One unique celebration of African culture, football, music and unity. One event. One community.',
  description:
    'African Vibes brings together the energy of a live football match, the warmth of a cultural showcase, the best Afrobeats and Amapiano selectors, and a night party under one roof. Come for the football, stay for the food, fashion, art and community.',
  startAt: '2027-07-18T15:00:00.000Z',
  endAt: '2027-07-19T02:00:00.000Z',
  timezone: 'Europe/London',
  currency: 'gbp',
  status: 'on_sale',
  venue: {
    name: 'The Grand Arena',
    addressLine: '1 Riverside Way',
    city: 'London',
    country: 'United Kingdom',
    mapUrl: 'https://maps.google.com/?q=London',
  },
  heroImageUrl: null,
  fees: {
    bookingFeePercent: 1.5,
    note: 'A 1.5% booking fee applies. Ticket prices include VAT where applicable.',
  },
  categories: [
    {
      key: 'football',
      title: 'Live Football',
      blurb: 'Big screens, live matches and a crowd that knows the game.',
      href: '/experience#football',
      icon: 'ball',
    },
    {
      key: 'culture',
      title: 'African Culture',
      blurb: 'Food, fashion, art and heritage brought to life.',
      href: '/experience#culture',
      icon: 'mask',
    },
    {
      key: 'djs',
      title: 'Top DJs & Artists',
      blurb: 'Afrobeats, Amapiano and live performances all day.',
      href: '/experience#music',
      icon: 'music',
    },
    {
      key: 'party',
      title: 'Night Party',
      blurb: 'The lights go down and the party goes all the way up.',
      href: '/experience#party',
      icon: 'sparkle',
    },
  ],
  highlights: [
    {
      title: 'Football Matches',
      description: 'Live screenings and matches on stadium-grade screens.',
      icon: 'ball',
    },
    {
      title: 'Cultural Showcase',
      description: 'Dance, drums, fashion and art from across the continent.',
      icon: 'mask',
    },
    {
      title: 'Top DJs & Artists',
      description: 'A full day of Afrobeats, Amapiano and live sets.',
      icon: 'music',
    },
    {
      title: 'Night Party',
      description: 'A late-night party to close out the celebration.',
      icon: 'sparkle',
    },
  ],
  whyAttend: [
    'Celebrate African heritage and culture with your community.',
    'Network and build new connections.',
    'Enjoy food, music, fashion and cultural experiences.',
    'Experience a vibrant, electric atmosphere from afternoon to late night.',
  ],
  performers: [
    'Live Afrobeats headline act',
    'Amapiano resident selectors',
    'Traditional drum & dance troupe',
    'Guest DJs to be announced',
  ],
  rules: [
    'Valid photo ID is required for entry.',
    'Digital tickets are scanned once at the gate.',
    'No outside food or drink.',
    'Bag searches may be carried out on entry.',
    'The organiser reserves the right to refuse admission.',
  ],
  accessibility: [
    'Step-free access to all main areas.',
    'Accessible toilets on site.',
    'Companion tickets available on request.',
    'Assistance dogs welcome.',
  ],
  faqs: [
    {
      question: 'What time should I arrive?',
      answer:
        'Doors open 30 minutes before the first scheduled activity. We recommend arriving early to enjoy the cultural showcase.',
    },
    {
      question: 'Are there age restrictions?',
      answer:
        'The daytime programme is family friendly. The night party is 18+ and photo ID is required.',
    },
    {
      question: 'Can I get a refund?',
      answer:
        'Tickets are refundable up to 7 days before the event unless stated otherwise at checkout.',
    },
    {
      question: 'How do group tickets work?',
      answer:
        'A group booking issues one booking reference and an individual QR ticket for each attendee.',
    },
  ],
  ticketTypes: [
    {
      id: 'tt_standard',
      key: 'standard',
      name: 'Standard Ticket',
      tagline: 'General admission',
      priceMinor: 3000,
      includesPeople: 1,
      benefits: [
        'General event entry',
        'Access to designated event areas',
        'Live performances',
        'Access to food and drink stalls (where permitted)',
      ],
      capacity: 1500,
      remaining: 1500,
      onSale: true,
    },
    {
      id: 'tt_group',
      key: 'group',
      name: 'Group Ticket',
      tagline: 'Bring the whole crew',
      priceMinor: 2500,
      includesPeople: 4,
      benefits: [
        'Discounted per-person pricing',
        'Individual QR ticket for every attendee',
        'One group booking reference',
        'Access to all standard areas',
      ],
      groupSizes: [4, 6, 10, 15],
      groupPricing: [
        { size: 4, totalMinor: 9600 },
        { size: 6, totalMinor: 14000 },
        { size: 10, totalMinor: 22500 },
        { size: 15, totalMinor: 33000 },
      ],
      capacity: 800,
      remaining: 800,
      onSale: true,
      featured: true,
    },
    {
      id: 'tt_vip',
      key: 'vip',
      name: 'VIP Ticket',
      tagline: 'The premium experience',
      priceMinor: 7500,
      includesPeople: 1,
      benefits: [
        'VIP area access',
        'Priority entrance',
        'Reserved seating (where provided)',
        'Premium drinks package (subject to event terms)',
        'Dedicated host (where provided)',
      ],
      capacity: 200,
      remaining: 200,
      onSale: true,
    },
    {
      id: 'tt_exclusive',
      key: 'exclusive',
      name: 'Exclusive Table',
      tagline: 'Reserved for your party',
      priceMinor: 50000,
      includesPeople: 10,
      benefits: [
        'Exclusive table reservation for 10',
        'Configurable premium services and benefits',
        'Priority entrance for your party',
        'Dedicated host',
      ],
      capacity: 20,
      remaining: 20,
      onSale: true,
    },
  ],
}
