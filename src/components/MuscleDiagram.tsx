import { FRONT_MUSCLES, BACK_MUSCLES } from 'body-muscles'
import { useApp } from '../state/AppContext'

interface MuscleDiagramProps {
  /** Couleur à appliquer à un muscle donné (identifiant `body-muscles`). */
  colorFor: (muscleId: string) => string
  /** Optionnel : rend chaque muscle cliquable (ex. ouvrir son détail). */
  onMuscleClick?: (muscleId: string) => void
}

/** Schéma anatomique face/dos, coloré muscle par muscle selon `colorFor` — support partagé par les différentes vues (activation par exercice, heat map d'entraînement...). */
export function MuscleDiagram({ colorFor, onMuscleClick }: MuscleDiagramProps) {
  const { t } = useApp()
  return (
    <div className="body-views">
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewFront')}</span>
        <svg viewBox="0 0 35 93" aria-hidden="true">
          {FRONT_MUSCLES.map((muscle) => (
            <path
              key={muscle.id}
              className={`muscle-path${onMuscleClick ? ' clickable' : ''}`}
              d={muscle.path}
              fill={colorFor(muscle.id)}
              onClick={onMuscleClick ? () => onMuscleClick(muscle.id) : undefined}
            />
          ))}
        </svg>
      </div>
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewBack')}</span>
        <svg viewBox="37 0 35 93" aria-hidden="true">
          {BACK_MUSCLES.map((muscle) => (
            <path
              key={muscle.id}
              className={`muscle-path${onMuscleClick ? ' clickable' : ''}`}
              d={muscle.path}
              fill={colorFor(muscle.id)}
              onClick={onMuscleClick ? () => onMuscleClick(muscle.id) : undefined}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
