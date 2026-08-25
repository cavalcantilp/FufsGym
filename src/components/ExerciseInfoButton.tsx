import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { IconInfo } from './icons'
import { exerciseMediaImages } from '../lib/exerciseMedia'
import { exerciseName } from '../lib/exercises'
import type { Exercise } from '../lib/types'

/** Bouton "i" ouvrant deux photos de démonstration (départ / contraction) ; masqué si aucune n'existe pour cet exercice. */
export function ExerciseInfoButton({ exercise }: { exercise: Exercise }) {
  const { t } = useApp()
  const [open, setOpen] = useState(false)
  const images = exerciseMediaImages(exercise.id)

  if (!images) return null

  return (
    <>
      <button type="button" className="icon-btn" onClick={() => setOpen(true)} aria-label={t('exerciseInfo.aria')}>
        <IconInfo size={17} />
      </button>
      {open ? (
        <Sheet title={exerciseName(exercise, t)} onClose={() => setOpen(false)} centered>
          <div className="exercise-info-images">
            {images.map((src) => (
              <img key={src} src={src} alt="" loading="lazy" />
            ))}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>{t('exerciseInfo.credit')}</p>
        </Sheet>
      ) : null}
    </>
  )
}
