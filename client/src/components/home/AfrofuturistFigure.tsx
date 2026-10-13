import type { ReactNode } from 'react'

/**
 * Purely decorative, CSS-drawn Afrofuturist figure used as the hero artwork.
 * No raster assets — the patterned headwrap, sun disc, orbit rings and ribbons
 * are all gradients and shapes so it stays crisp and on-brand.
 */
export function AfrofuturistFigure({ chips }: { chips?: ReactNode }) {
  return (
    <div className="av-figure" aria-hidden="true">
      <div className="av-figure__orbit" />
      <div className="av-figure__orbit av-figure__orbit--two" />
      <div className="av-figure__ribbon av-figure__ribbon--gold" />
      <div className="av-figure__ribbon av-figure__ribbon--teal" />
      <div className="av-figure__sun" />

      {chips}

      <div className="av-person">
        <div className="av-person__head">
          <div className="av-headwrap" />
        </div>
        <div className="av-person__body">
          <div className="av-kente" />
        </div>
      </div>
    </div>
  )
}
