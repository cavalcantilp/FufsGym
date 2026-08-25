import { useEffect, type ReactNode } from 'react'
import { IconClose } from './icons'

interface SheetProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  /** Centrée à l'écran façon boîte de dialogue, plutôt qu'ancrée en bas (par défaut). */
  centered?: boolean
}

/** Feuille modale ancrée en bas d'écran (ou centrée si `centered`), fermable par Échap ou par l'arrière-plan. */
export function Sheet({ title, subtitle, onClose, children, centered = false }: SheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className={`sheet-backdrop${centered ? ' centered' : ''}`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={`sheet${centered ? ' centered' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <span className="sub">{subtitle}</span> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={title}>
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
