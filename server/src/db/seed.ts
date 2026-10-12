import { hashPassword } from '../auth/passwords.js'
import { closeDb, db } from './client.js'
import { featuredEvent, promos as seedPromos } from '../domain/eventSeed.js'
import { events, promos, ticketTypes, users } from './schema.js'

if (!db) {
  console.error('DATABASE_URL is not configured — cannot seed.')
  process.exit(1)
}

const database = db

async function seedEvents() {
  const eventRow = {
    id: featuredEvent.id,
    slug: featuredEvent.slug,
    name: featuredEvent.name,
    tagline: featuredEvent.tagline,
    headline: featuredEvent.headline,
    summary: featuredEvent.summary,
    description: featuredEvent.description,
    startAt: new Date(featuredEvent.startAt),
    endAt: new Date(featuredEvent.endAt),
    timezone: featuredEvent.timezone,
    currency: featuredEvent.currency,
    status: featuredEvent.status,
    venue: featuredEvent.venue,
    heroImageUrl: featuredEvent.heroImageUrl,
    fees: featuredEvent.fees,
    categories: featuredEvent.categories,
    highlights: featuredEvent.highlights,
    whyAttend: featuredEvent.whyAttend,
    performers: featuredEvent.performers,
    rules: featuredEvent.rules,
    accessibility: featuredEvent.accessibility,
    faqs: featuredEvent.faqs,
    featured: true,
    updatedAt: new Date(),
  }

  await database
    .insert(events)
    .values(eventRow)
    .onConflictDoUpdate({ target: events.id, set: eventRow })

  for (const [index, ticket] of featuredEvent.ticketTypes.entries()) {
    const row = {
      id: ticket.id,
      eventId: featuredEvent.id,
      key: ticket.key,
      name: ticket.name,
      tagline: ticket.tagline,
      priceMinor: ticket.priceMinor,
      includesPeople: ticket.includesPeople,
      benefits: ticket.benefits,
      groupSizes: ticket.groupSizes ?? null,
      groupPricing: ticket.groupPricing ?? null,
      capacity: ticket.capacity,
      remaining: ticket.remaining,
      onSale: ticket.onSale,
      featured: ticket.featured ?? false,
      sortOrder: index,
      updatedAt: new Date(),
    }
    await database
      .insert(ticketTypes)
      .values(row)
      .onConflictDoUpdate({ target: ticketTypes.id, set: row })
  }

  for (const promo of seedPromos) {
    const row = {
      code: promo.code,
      kind: promo.kind,
      value: promo.value,
      label: promo.label,
      active: promo.active,
      minSubtotalMinor: promo.minSubtotalMinor ?? null,
      maxDiscountMinor: promo.maxDiscountMinor ?? null,
      updatedAt: new Date(),
    }
    await database
      .insert(promos)
      .values(row)
      .onConflictDoUpdate({ target: promos.code, set: row })
  }

  console.log(`Seeded event "${featuredEvent.name}" with ${featuredEvent.ticketTypes.length} ticket types and ${seedPromos.length} promo codes.`)
}

async function seedUsers() {
  const allowDemo = process.env.SEED_DEMO_ACCOUNTS === 'true'
  if (process.env.NODE_ENV === 'production' && !allowDemo) {
    console.log(
      'Skipping demo users in production (set SEED_DEMO_ACCOUNTS=true to seed demo accounts).',
    )
    return
  }

  const seedUsers = [
    {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@africanvibes.test',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
      firstName: 'Ava',
      lastName: 'Admin',
      role: 'admin',
    },
    {
      email: process.env.SEED_CUSTOMER_EMAIL ?? 'customer@africanvibes.test',
      password: process.env.SEED_CUSTOMER_PASSWORD ?? 'Customer123!',
      firstName: 'Cody',
      lastName: 'Customer',
      role: 'customer',
    },
  ]

  for (const user of seedUsers) {
    await database
      .insert(users)
      .values({
        email: user.email.toLowerCase(),
        passwordHash: await hashPassword(user.password),
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerifiedAt: new Date(),
      })
      .onConflictDoNothing({ target: users.email })
    console.log(`Ensured ${user.role} account: ${user.email}`)
  }
}

try {
  await seedEvents()
  await seedUsers()
  console.log('Seed complete.')
} catch (err) {
  console.error('Seed failed:', err)
  process.exitCode = 1
} finally {
  await closeDb()
}
