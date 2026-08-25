import { FRONT_MUSCLES, BACK_MUSCLES } from 'body-muscles'
import { useApp } from '../state/AppContext'

interface MuscleDiagramProps {
  /** Couleur à appliquer à un muscle donné (identifiant `body-muscles`). */
  colorFor: (muscleId: string) => string
  /** Optionnel : rend certains muscles cliquables (ex. ouvrir leur détail). */
  onMuscleClick?: (muscleId: string) => void
  /** Restreint les muscles cliquables (ex. seulement ceux ayant des exercices) ; tous cliquables par défaut si `onMuscleClick` est fourni. */
  isClickable?: (muscleId: string) => boolean
}

/** Schéma anatomique face/dos, coloré muscle par muscle selon `colorFor` — support partagé par les différentes vues (activation par exercice, heat map d'entraînement...). */
export function MuscleDiagram({ colorFor, onMuscleClick, isClickable }: MuscleDiagramProps) {
  const { t } = useApp()

  const renderMuscle = (muscle: { id: string; path: string }) => {
    const clickable = Boolean(onMuscleClick) && (isClickable ? isClickable(muscle.id) : true)
    return (
      <path
        key={muscle.id}
        className={`muscle-path${clickable ? ' clickable' : ''}`}
        d={muscle.path}
        fill={colorFor(muscle.id)}
        onClick={clickable ? () => onMuscleClick?.(muscle.id) : undefined}
      />
    )
  }

  return (
    <div className="body-views">
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewFront')}</span>
        <svg viewBox="0 0 35 93" aria-hidden="true">
          {FRONT_MUSCLES.map(renderMuscle)}
        </svg>
      </div>
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewBack')}</span>
        <svg viewBox="37 0 35 93" aria-hidden="true">
          {BACK_MUSCLES.map(renderMuscle)}
        </svg>
      </div>
    </div>
  )
}
