import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { GlassCard } from '../../components/ui/GlassCard'
import { Icon } from '../../components/ui/Icon'
import {
  ApiError,
  createAdminGalleryItem,
  deleteAdminGalleryItem,
  listAdminEvents,
  listAdminGallery,
  updateAdminGalleryItem,
  uploadAdminImage,
} from '../../lib/api'
import type { EventDetail, GalleryInput, GalleryItem } from '../../types'

interface GalleryForm {
  id: string | null
  title: string
  caption: string
  imageUrl: string
  alt: string
  eventId: string
  sortOrder: string
  published: boolean
}

const emptyForm: GalleryForm = {
  id: null,
  title: '',
  caption: '',
  imageUrl: '',
  alt: '',
  eventId: '',
  sortOrder: '0',
  published: true,
}

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

export function AdminGalleryPage() {
  const { accessToken } = useAuth()

  const [items, setItems] = useState<GalleryItem[] | null>(null)
  const [events, setEvents] = useState<EventDetail[]>([])
  const [form, setForm] = useState<GalleryForm>(emptyForm)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function load() {
    if (!accessToken) return
    listAdminGallery(accessToken)
      .then(setItems)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load gallery items.'),
      )
    listAdminEvents(accessToken)
      .then(setEvents)
      .catch(() => setEvents([]))
  }

  useEffect(load, [accessToken])

  function startEdit(item: GalleryItem) {
    setError(null)
    setMessage(null)
    setForm({
      id: item.id,
      title: item.title,
      caption: item.caption,
      imageUrl: item.imageUrl,
      alt: item.alt,
      eventId: item.eventId ?? '',
      sortOrder: String(item.sortOrder),
      published: item.published,
    })
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !accessToken) return
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Images must be 6MB or smaller.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const result = await uploadAdminImage({ dataUrl, filename: file.name }, accessToken)
      setForm((prev) => ({
        ...prev,
        imageUrl: result.url,
        alt: prev.alt || file.name.replace(/\.[^.]+$/, ''),
      }))
      setMessage('Image uploaded. Add a title and save to publish.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload the image.')
    } finally {
      setUploading(false)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!accessToken) return
    setBusy(true)
    setError(null)
    setMessage(null)

    const payload: GalleryInput = {
      title: form.title.trim(),
      caption: form.caption.trim(),
      imageUrl: form.imageUrl.trim(),
      alt: form.alt.trim(),
      eventId: form.eventId || null,
      sortOrder: Number(form.sortOrder) || 0,
      published: form.published,
    }

    try {
      if (form.id) {
        await updateAdminGalleryItem(form.id, payload, accessToken)
        setMessage('Gallery item updated.')
      } else {
        await createAdminGalleryItem(payload, accessToken)
        setMessage('Gallery item added.')
      }
      setForm(emptyForm)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the gallery item.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(item: GalleryItem) {
    if (!accessToken) return
    if (!window.confirm(`Delete "${item.title}"?`)) return
    setError(null)
    setMessage(null)
    try {
      await deleteAdminGalleryItem(item.id, accessToken)
      setMessage('Gallery item deleted.')
      if (form.id === item.id) setForm(emptyForm)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the gallery item.')
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-cream">Gallery media</h2>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-ash">
              <tr>
                <th className="px-5 py-3 font-semibold">Preview</th>
                <th className="px-5 py-3 font-semibold">Details</th>
                <th className="px-5 py-3 font-semibold">Event</th>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {(items ?? []).map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <div className="kente h-14 w-24 overflow-hidden rounded-lg border border-white/12">
                      <img
                        src={item.imageUrl}
                        alt={item.alt || item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-cream">{item.title}</p>
                    <p className="max-w-xs truncate text-xs text-subtle">{item.caption || '—'}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-subtle">{item.eventName ?? '—'}</td>
                  <td className="px-5 py-4 text-cream">{item.sortOrder}</td>
                  <td className="px-5 py-4">
                    <Badge tone={item.published ? 'success' : 'neutral'}>
                      {item.published ? 'published' : 'hidden'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(item)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-subtle">
                    No gallery items yet. Upload an image or paste a URL below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 p-6">
        <h3 className="font-display text-base font-bold text-cream">
          {form.id ? 'Edit gallery item' : 'Add gallery item'}
        </h3>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Title</span>
              <input
                value={form.title}
                required
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Caption</span>
              <input
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Alt text</span>
              <input
                value={form.alt}
                onChange={(e) => setForm({ ...form, alt: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Image URL</span>
              <input
                value={form.imageUrl}
                required
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://… or upload below"
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Upload file</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onFile}
                disabled={uploading}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-subtle file:mr-3 file:rounded-lg file:border-0 file:bg-gold/20 file:px-3 file:py-1.5 file:text-gold"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Linked event</span>
              <select
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              >
                <option value="" className="bg-ink">None</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id} className="bg-ink">
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-cream/90">Sort order</span>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-cream focus:border-gold focus:outline-none"
              />
            </label>
            <label className="flex items-end gap-2 pb-3 text-sm text-subtle">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
                className="h-4 w-4 accent-[#e7c36a]"
              />
              Published
            </label>
          </div>

          {form.imageUrl && (
            <div className="flex items-center gap-4">
              <div className="kente h-24 w-40 overflow-hidden rounded-lg border border-white/12">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-xs text-subtle">Preview</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || uploading}>
              {busy ? 'Saving…' : form.id ? 'Save changes' : 'Add to gallery'}
            </Button>
            {form.id && (
              <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
                Cancel
              </Button>
            )}
            {uploading && (
              <span className="inline-flex items-center gap-2 text-sm text-subtle">
                <Icon name="info" className="h-4 w-4" />
                Uploading…
              </span>
            )}
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
