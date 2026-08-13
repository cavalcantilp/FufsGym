import type { ReactNode } from 'react'
import { IconChevronLeft } from './icons'

interface FormPageProps {
  /** Chaîne pour un titre simple ; nœud React pour un titre interactif (ex. champ éditable). */
  title: ReactNode
  subtitle?: string
  /** Libellé accessible du bouton retour, requis quand `title` n'est pas une chaîne. */
  backLabel?: string
  onBack: () => void
  children: ReactNode
}

/**
 * Page de formulaire à part entière plutôt qu'une feuille modale : sur mobile,
 * un clavier qui s'ouvre au-dessus d'une feuille plafonnée à 90vh finit par
 * masquer les boutons du bas. En page normale, le document défile avec le
 * clavier comme n'importe quel autre écran de l'appli.
 */
export function FormPage({ title, subtitle, backLabel, onBack, children }: FormPageProps) {
  const ariaLabel = backLabel ?? (typeof title === 'string' ? title : undefined)
  return (
    <div className="screen">
      <div className="form-page-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={ariaLabel}>
          <IconChevronLeft />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {subtitle ? <span className="sub">{subtitle}</span> : null}
        </div>
      </div>
      {children}
    </div>
  )
}
