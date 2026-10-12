import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import express, { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../auth/middleware.js'
import { env } from '../env.js'

const MAX_BYTES = 6 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/

const uploadSchema = z.object({
  filename: z.string().max(200).optional(),
  dataUrl: z.string().min(24).max(12_000_000),
})

/**
 * Admin image upload. Registered before the global JSON parser so it can accept
 * a larger body. Images arrive as a base64 data URL, are decoded to disk under
 * the upload directory and served statically at `/uploads/...`.
 */
export const uploadsRouter = Router()
uploadsRouter.use(express.json({ limit: '12mb' }))

uploadsRouter.post(
  '/admin/uploads',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    const parsed = uploadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid upload.' })
    }

    const match = DATA_URL_RE.exec(parsed.data.dataUrl)
    if (!match) {
      return res
        .status(400)
        .json({ error: 'Only PNG, JPEG, WebP and GIF images are supported.' })
    }

    const mime = match[1]!
    const buffer = Buffer.from(match[2]!, 'base64')
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'The uploaded image is empty.' })
    }
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Images must be 6MB or smaller.' })
    }

    const ext = EXTENSIONS[mime] ?? 'bin'
    const name = `${randomUUID()}.${ext}`
    await mkdir(env.uploadDir, { recursive: true })
    await writeFile(join(env.uploadDir, name), buffer)

    res.status(201).json({
      url: `${env.baseUrl}/uploads/${name}`,
      filename: name,
    })
  },
)
