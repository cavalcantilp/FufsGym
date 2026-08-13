import type { ReactNode } from 'react'
import { IconChevronLeft } from './icons'

interface FormPageProps {
  title: string
  subtitle?: string
  onBack: () => void
  children: ReactNode
}

/**
 * Page de formulaire à part entière plutôt qu'une feuille modale : sur mobile,
 * un clavier qui s'ouvre au-dessus d'une feuille plafonnée à 90vh finit par
 * masquer les boutons du bas. En page normale, le document défile avec le
 * clavier comme n'importe quel autre écran de l'appli.
 */
export function FormPage({ title, subtitle, onBack, children }: FormPageProps) {
  return (
    <div className="screen">
      <div className="form-page-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={title}>
          <IconChevronLeft />
        </button>
        <div>
          <h2>{title}</h2>
          {subtitle ? <span className="sub">{subtitle}</span> : null}
        </div>
      </div>
      {children}
    </div>
  )
}
