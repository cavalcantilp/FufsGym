import { FRONT_MUSCLES, BACK_MUSCLES } from 'body-muscles'
import { useApp } from '../state/AppContext'

interface MuscleDiagramProps {
  /** Intensité 0-1 par identifiant de muscle `body-muscles` ; absent = non sollicité. */
  activation: Record<string, number>
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const NEUTRAL: [number, number, number] = [100, 116, 139]
const PINK: [number, number, number] = [236, 72, 153]
const RED: [number, number, number] = [239, 68, 68]

/** 0 -> gris neutre, 0.5 -> rose, 1 -> rouge accent. */
function activationColor(t: number): string {
  const [from, to, localT] = t <= 0.5 ? [NEUTRAL, PINK, t / 0.5] : [PINK, RED, (t - 0.5) / 0.5]
  const rgb = [0, 1, 2].map((i) => Math.round(lerp(from[i], to[i], localT)))
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

function fillFor(id: string, activation: Record<string, number>): string {
  const intensity = activation[id] ?? 0
  return intensity > 0 ? activationColor(intensity) : 'var(--neutral-fill)'
}

/** Schéma anatomique face/dos coloré selon l'activation musculaire propre à un exercice. */
export function MuscleDiagram({ activation }: MuscleDiagramProps) {
  const { t } = useApp()
  return (
    <div className="body-views">
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewFront')}</span>
        <svg viewBox="0 0 35 93" aria-hidden="true">
          {FRONT_MUSCLES.map((muscle) => (
            <path key={muscle.id} className="muscle-path" d={muscle.path} fill={fillFor(muscle.id, activation)} />
          ))}
        </svg>
      </div>
      <div className="body-view">
        <span className="view-label">{t('exerciseInfo.viewBack')}</span>
        <svg viewBox="37 0 35 93" aria-hidden="true">
          {BACK_MUSCLES.map((muscle) => (
            <path key={muscle.id} className="muscle-path" d={muscle.path} fill={fillFor(muscle.id, activation)} />
          ))}
        </svg>
      </div>
    </div>
  )
}
