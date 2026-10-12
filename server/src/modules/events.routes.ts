import { Router } from 'express'
import {
  getEventBySlug,
  getFeaturedEvent,
  listEvents,
} from '../db/events.repo.js'

export const eventsRouter = Router()

eventsRouter.get('/events/featured', async (_req, res) => {
  const event = await getFeaturedEvent()
  if (!event) {
    return res.status(404).json({ error: 'No featured event' })
  }
  res.json(event)
})

eventsRouter.get('/events', async (_req, res) => {
  res.json(await listEvents())
})

eventsRouter.get('/events/:slug', async (req, res) => {
  const event = await getEventBySlug(req.params.slug)
  if (!event) {
    return res.status(404).json({ error: 'Event not found' })
  }
  res.json(event)
})
