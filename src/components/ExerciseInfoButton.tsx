import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { MuscleDiagram } from './MuscleDiagram'
import { IconInfo } from './icons'
import { exerciseMediaImages } from '../lib/exerciseMedia'
import { EXERCISE_ACTIVATION } from '../lib/exerciseActivation'
import { exerciseName } from '../lib/exercises'
import { ACTIVATION_STOPS, NEUTRAL_MUSCLE_COLOR, interpolateColor } from '../lib/colorScale'
import type { TranslationKey } from '../i18n/translations'
import type { Exercise } from '../lib/types'

/** Bouton "i" ouvrant le schéma d'activation musculaire et/ou des photos d'exécution ; masqué si aucun n'existe pour cet exercice. */
export function ExerciseInfoButton({ exercise }: { exercise: Exercise }) {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const images = exerciseMediaImages(exercise.id)
  const activation = EXERCISE_ACTIVATION[exercise.id]

  if (!images && !activation) return null

  const colorFor = (muscleId: string) => {
    const intensity = activation?.[muscleId] ?? 0
    return intensity > 0 ? interpolateColor(ACTIVATION_STOPS, intensity) : NEUTRAL_MUSCLE_COLOR
  }

  return (
    <>
      <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label={t('exerciseInfo.aria')}>
        <IconInfo size={17} />
      </button>
      {open ? (
        <Sheet title={exerciseName(exercise, t)} onClose={() => setOpen(false)} centered>
          {activation ? (
            <div className="info-section">
              <span className="info-section-title">{t('exerciseInfo.muscleTitle')}</span>
              <MuscleDiagram colorFor={colorFor} />
              <div className="legend">
                <span className="legend-label">{t('exerciseInfo.legendLow')}</span>
                <span className="legend-bar" />
                <span className="legend-label">{t('exerciseInfo.legendHigh')}</span>
              </div>
              <p className="hint">{t('exerciseInfo.muscleCredit')}</p>
            </div>
          ) : (
            <p className="hint">{t('exerciseInfo.noZone')}</p>
          )}
          {images ? (
            <div className="info-section">
              <span className="info-section-title">{t('exerciseInfo.executionTitle')}</span>
              <div className="exercise-info-images">
                {images.map((src) => (
                  <img key={src} src={src} alt="" loading="lazy" className="grayscale" />
                ))}
              </div>
              <p className="exercise-info-tip">{t(`exerciseTip.${exercise.id}` as TranslationKey)}</p>
              <p className="hint">{t('exerciseInfo.credit')}</p>
            </div>
          ) : null}
        </Sheet>
      ) : null}
    </>
  )
}
