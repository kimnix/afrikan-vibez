import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { db } from './client.js'
import { BookingError } from './bookings.repo.js'
import { events, galleryItems, type GalleryItemRow } from './schema.js'

function database() {
  if (!db) throw new BookingError(503, 'Database is not configured.')
  return db
}

export interface GalleryItem {
  id: string
  title: string
  caption: string
  imageUrl: string
  alt: string
  eventId: string | null
  eventName: string | null
  eventSlug: string | null
  sortOrder: number
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface GalleryInput {
  title: string
  caption?: string
  imageUrl: string
  alt?: string
  eventId?: string | null
  sortOrder?: number
  published?: boolean
}

function toItem(
  row: GalleryItemRow,
  event?: { name: string | null; slug: string | null } | null,
): GalleryItem {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    imageUrl: row.imageUrl,
    alt: row.alt,
    eventId: row.eventId,
    eventName: event?.name ?? null,
    eventSlug: event?.slug ?? null,
    sortOrder: row.sortOrder,
    published: row.published,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function selectItems(publishedOnly: boolean): Promise<GalleryItem[]> {
  const dbc = database()
  const query = dbc
    .select({
      item: galleryItems,
      eventName: events.name,
      eventSlug: events.slug,
    })
    .from(galleryItems)
    .leftJoin(events, eq(galleryItems.eventId, events.id))
    .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.createdAt))

  const rows = publishedOnly
    ? await query.where(eq(galleryItems.published, true))
    : await query

  return rows.map((row) => toItem(row.item, { name: row.eventName, slug: row.eventSlug }))
}

export function listPublishedGallery(): Promise<GalleryItem[]> {
  return selectItems(true)
}

export function listAllGallery(): Promise<GalleryItem[]> {
  return selectItems(false)
}

export async function getGalleryItem(id: string): Promise<GalleryItem | undefined> {
  const dbc = database()
  const [row] = await dbc
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.id, id))
    .limit(1)
  return row ? toItem(row) : undefined
}

export async function createGalleryItem(input: GalleryInput): Promise<GalleryItem> {
  const dbc = database()
  const id = `gal_${randomUUID()}`
  const [row] = await dbc
    .insert(galleryItems)
    .values({
      id,
      title: input.title,
      caption: input.caption ?? '',
      imageUrl: input.imageUrl,
      alt: input.alt ?? '',
      eventId: input.eventId ?? null,
      sortOrder: input.sortOrder ?? 0,
      published: input.published ?? true,
      updatedAt: new Date(),
    })
    .returning()
  return toItem(row!)
}

export async function updateGalleryItem(
  id: string,
  input: Partial<GalleryInput>,
): Promise<GalleryItem> {
  const dbc = database()
  const updates: Partial<typeof galleryItems.$inferInsert> = { updatedAt: new Date() }
  if (input.title !== undefined) updates.title = input.title
  if (input.caption !== undefined) updates.caption = input.caption
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl
  if (input.alt !== undefined) updates.alt = input.alt
  if (input.eventId !== undefined) updates.eventId = input.eventId
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder
  if (input.published !== undefined) updates.published = input.published

  const [row] = await dbc
    .update(galleryItems)
    .set(updates)
    .where(eq(galleryItems.id, id))
    .returning()
  if (!row) throw new BookingError(404, 'Gallery item not found.')
  return toItem(row)
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const dbc = database()
  const [row] = await dbc
    .delete(galleryItems)
    .where(eq(galleryItems.id, id))
    .returning({ id: galleryItems.id })
  if (!row) throw new BookingError(404, 'Gallery item not found.')
}
