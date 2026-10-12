import { Router } from 'express'
import { BookingError } from '../db/bookings.repo.js'
import { listPublishedGallery } from '../db/gallery.repo.js'

export const galleryRouter = Router()

/** Published gallery media for the public gallery page. */
galleryRouter.get('/gallery', async (_req, res) => {
  try {
    res.json({ items: await listPublishedGallery() })
  } catch (err) {
    if (err instanceof BookingError) {
      return res.status(err.status).json({ error: err.message })
    }
    throw err
  }
})
