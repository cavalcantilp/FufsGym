import { useId } from 'react'
import { useApp } from '../state/AppContext'
import { BODY_BACK, BODY_FRONT, type BodyView } from '../lib/bodyAnatomy'

interface MuscleDiagramProps {
  /** Couleur à appliquer à un muscle donné (ex. "chest-upper-left"). */
  colorFor: (muscleId: string) => string
  /** Optionnel : rend certains muscles cliquables (ex. ouvrir leur détail). */
  onMuscleClick?: (muscleId: string) => void
  /** Restreint les muscles cliquables (ex. seulement ceux ayant des exercices) ; tous cliquables par défaut si `onMuscleClick` est fourni. */
  isClickable?: (muscleId: string) => boolean
}

/** Schéma anatomique face/dos, coloré muscle par muscle selon `colorFor` — support partagé par les différentes vues (activation par exercice, heat map d'entraînement...). */
export function MuscleDiagram({ colorFor, onMuscleClick, isClickable }: MuscleDiagramProps) {
  const { t } = useApp()
  const uid = useId()

  const renderView = (view: BodyView, key: string) => (
    <svg viewBox={view.viewBox} aria-hidden="true">
      <defs>
        {view.regions.map((region, index) =>
          region.clip ? (
            <clipPath key={index} id={`${uid}${key}${index}`}>
              <rect x={region.clip[0]} y={region.clip[1]} width={region.clip[2]} height={region.clip[3]} />
            </clipPath>
          ) : null,
        )}
      </defs>
      {view.regions.map((region, index) => {
        const id = region.id
        if (!id) return <path key={index} className="body-part" d={region.d} />
        const clickable = Boolean(onMuscleClick) && (isClickable ? isClickable(id) : true)
        return (
          <path
            key={index}
            className={`muscle-path${clickable ? ' clickable' : ''}`}
            d={region.d}
            fill={colorFor(id)}
            clipPath={region.clip ? `url(#${uid}${key}${index})` : undefined}
            onClick={clickable ? () => onMuscleClick?.(id) : undefined}
          />
        )
      })}
    </svg>
  )

  return (
    <div className="body-views">
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewFront')}</span>
        {renderView(BODY_FRONT, 'f')}
      </div>
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewBack')}</span>
        {renderView(BODY_BACK, 'b')}
      </div>
    </div>
  )
}
