import { useRef, useState, type ReactNode } from 'react'

export interface SortableItem {
  id: string
  content: ReactNode
}

interface DragState {
  from: number
  to: number
  /** Déplacement vertical du doigt depuis la prise, défilement de la page compris. */
  dy: number
  /** Hauteur de l'élément saisi (marge comprise) : c'est de combien les voisins se décalent. */
  size: number
}

const EDGE = 70
const MAX_SCROLL_STEP = 14

/**
 * Liste réordonnable au doigt : on saisit la poignée, l'élément suit, les voisins
 * s'écartent en direct, on relâche à l'endroit voulu. Au clavier, flèches haut/bas sur la poignée.
 */
export function SortableList({
  items,
  onReorder,
  handleLabel,
  className = '',
}: {
  items: SortableItem[]
  onReorder: (from: number, to: number) => void
  handleLabel: string
  className?: string
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [drag, setDrag] = useState<DragState | null>(null)
  const session = useRef<{ startY: number; startScroll: number; pointerY: number; mids: number[]; frame: number } | null>(null)

  const update = (from: number, size: number) => {
    const current = session.current
    if (!current) return
    const dy = current.pointerY - current.startY + (window.scrollY - current.startScroll)
    const center = current.mids[from] + dy
    // Position visée : nombre de voisins dont le milieu est dépassé par le milieu de l'élément saisi.
    let to = 0
    current.mids.forEach((mid, index) => {
      if (index !== from && (index < from ? mid < center : mid <= center)) to += 1
    })
    setDrag({ from, to, dy, size })
  }

  const start = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    if (items.length < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return
    const rects = refs.current.slice(0, items.length).map((node) => node?.getBoundingClientRect())
    if (rects.some((rect) => !rect)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const mids = rects.map((rect) => rect!.top + rect!.height / 2 + window.scrollY)
    const size = index + 1 < rects.length ? rects[index + 1]!.top - rects[index]!.top : rects[index]!.bottom - rects[index - 1]!.bottom
    session.current = { startY: event.clientY, startScroll: window.scrollY, pointerY: event.clientY, mids, frame: 0 }
    setDrag({ from: index, to: index, dy: 0, size })

    // Défilement automatique quand le doigt approche du haut ou du bas de l'écran.
    const tick = () => {
      const current = session.current
      if (!current) return
      const y = current.pointerY
      const step = y < EDGE ? -Math.ceil(((EDGE - y) / EDGE) * MAX_SCROLL_STEP) : y > window.innerHeight - EDGE ? Math.ceil(((y - (window.innerHeight - EDGE)) / EDGE) * MAX_SCROLL_STEP) : 0
      if (step) {
        window.scrollBy(0, step)
        update(index, size)
      }
      current.frame = requestAnimationFrame(tick)
    }
    session.current.frame = requestAnimationFrame(tick)
  }

  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!session.current || !drag) return
    session.current.pointerY = event.clientY
    update(drag.from, drag.size)
  }

  const end = (commit: boolean) => {
    if (!session.current) return
    cancelAnimationFrame(session.current.frame)
    session.current = null
    const finished = drag
    setDrag(null)
    if (commit && finished && finished.from !== finished.to) onReorder(finished.from, finished.to)
  }

  const onKey = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const to = event.key === 'ArrowUp' ? index - 1 : event.key === 'ArrowDown' ? index + 1 : -1
    if (to < 0 || to >= items.length) return
    event.preventDefault()
    onReorder(index, to)
    requestAnimationFrame(() => refs.current[to]?.querySelector<HTMLButtonElement>('.drag-handle')?.focus())
  }

  return (
    <div className={`sortable${drag ? ' dragging' : ''} ${className}`.trim()}>
      {items.map((item, index) => {
        let offset = 0
        if (drag) {
          if (index === drag.from) offset = drag.dy
          else if (drag.from < drag.to && index > drag.from && index <= drag.to) offset = -drag.size
          else if (drag.from > drag.to && index >= drag.to && index < drag.from) offset = drag.size
        }
        const active = drag?.from === index
        return (
          <div
            key={item.id}
            ref={(node) => {
              refs.current[index] = node
            }}
            className={`sortable-item${active ? ' active' : ''}`}
            style={drag ? { transform: `translateY(${offset}px)` } : undefined}
          >
            <button
              type="button"
              className="drag-handle"
              aria-label={handleLabel}
              onPointerDown={(event) => start(index, event)}
              onPointerMove={move}
              onPointerUp={() => end(true)}
              onPointerCancel={() => end(false)}
              onKeyDown={(event) => onKey(index, event)}
              onContextMenu={(event) => event.preventDefault()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="5.5" cy="3.5" r="1.4" />
                <circle cx="10.5" cy="3.5" r="1.4" />
                <circle cx="5.5" cy="8" r="1.4" />
                <circle cx="10.5" cy="8" r="1.4" />
                <circle cx="5.5" cy="12.5" r="1.4" />
                <circle cx="10.5" cy="12.5" r="1.4" />
              </svg>
            </button>
            <div className="sortable-content">{item.content}</div>
          </div>
        )
      })}
    </div>
  )
}
