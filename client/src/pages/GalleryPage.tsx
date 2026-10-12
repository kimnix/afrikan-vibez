import { useEffect, useMemo, useRef, useState } from 'react'
import { Container } from '../components/ui/Container'
import { Icon } from '../components/ui/Icon'
import { PageHero } from '../components/ui/PageHero'
import { getGallery } from '../lib/api'
import type { GalleryItem } from '../types'

interface ViewItem {
  key: string
  title: string
  caption: string
  imageUrl: string | null
  alt: string
  span: boolean
}

const placeholders: ViewItem[] = [
  { key: 'p1', title: 'Match day', caption: 'The crowd reacts to a goal', imageUrl: null, alt: '', span: true },
  { key: 'p2', title: 'Cultural showcase', caption: 'Traditional dancers take the stage', imageUrl: null, alt: '', span: false },
  { key: 'p3', title: 'Afrobeats live', caption: 'Headline performance', imageUrl: null, alt: '', span: false },
  { key: 'p4', title: 'Street food', caption: 'Flavours from across the continent', imageUrl: null, alt: '', span: false },
  { key: 'p5', title: 'Amapiano set', caption: 'The floor fills up', imageUrl: null, alt: '', span: false },
  { key: 'p6', title: 'Fashion', caption: 'Designer showcase', imageUrl: null, alt: '', span: true },
  { key: 'p7', title: 'Night party', caption: 'Lights down, hands up', imageUrl: null, alt: '', span: false },
  { key: 'p8', title: 'Community', caption: 'New friends, one vibe', imageUrl: null, alt: '', span: false },
]

function toView(item: GalleryItem, index: number): ViewItem {
  return {
    key: item.id,
    title: item.title,
    caption: item.caption,
    imageUrl: item.imageUrl,
    alt: item.alt || item.title,
    span: index % 5 === 0,
  }
}

export function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[] | null>(null)
  const [active, setActive] = useState<ViewItem | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getGallery(controller.signal)
      .then(setItems)
      .catch(() => setItems([]))
    return () => controller.abort()
  }, [])

  const viewing = useMemo<ViewItem[]>(() => {
    if (items && items.length > 0) return items.map(toView)
    return placeholders
  }, [items])

  const usingPlaceholders = !items || items.length === 0

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active])

  // Move focus into the dialog when it opens and restore it on close.
  useEffect(() => {
    if (active) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null
      closeRef.current?.focus()
    } else {
      restoreFocusRef.current?.focus?.()
    }
  }, [active])

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Moments & highlights"
        description="A look inside African Vibes. Photos and videos are managed from the admin dashboard."
      />

      <Container className="py-12">
        <div className="grid auto-rows-[200px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {viewing.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(item)}
              className={`photo kente group relative overflow-hidden rounded-card border border-white/12 text-left transition hover:border-gold/40 ${
                item.span ? 'sm:col-span-2' : ''
              }`}
              aria-label={`Open ${item.title}`}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.alt}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-accent/10" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <span className="absolute bottom-4 left-4 right-4">
                <span className="block font-semibold text-cream">{item.title}</span>
                <span className="block text-xs text-subtle">{item.caption}</span>
              </span>
              <Icon
                name="sparkle"
                className="absolute right-4 top-4 h-5 w-5 text-gold opacity-0 transition group-hover:opacity-100"
              />
            </button>
          ))}
        </div>

        {usingPlaceholders && (
          <p className="mt-6 text-center text-sm text-ash">
            Placeholder visuals — real event photography is uploaded by admins.
          </p>
        )}
      </Container>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="photo kente relative aspect-video overflow-hidden rounded-card border border-white/12">
              {active.imageUrl ? (
                <img
                  src={active.imageUrl}
                  alt={active.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gold/15 via-transparent to-accent/15" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="font-display text-2xl font-extrabold text-cream">
                  {active.title}
                </p>
                <p className="text-sm text-subtle">{active.caption}</p>
              </div>
            </div>
            <button
              type="button"
              ref={closeRef}
              onClick={() => setActive(null)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-cream"
            >
              <Icon name="close" className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
