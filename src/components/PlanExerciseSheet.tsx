import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { NumberField } from './NumberField'
import { ExerciseInfoButton } from './ExerciseInfoButton'
import { exerciseMediaImages } from '../lib/exerciseMedia'
import { exerciseName } from '../lib/exercises'
import { DEFAULT_REST_SEC, REST_STEP_SEC, MIN_REST_SEC, formatRestTime } from '../lib/rest'
import type { Exercise, PlanExercise } from '../lib/types'

interface PlanExerciseSheetProps {
  exercise: Exercise
  initial?: PlanExercise
  onConfirm: (entry: { sets: number; reps: string; note?: string; restSec: number }) => void
  onClose: () => void
}

/**
 * Objectif d'un exercice au sein d'un jour de programme. Trois formes : séries
 * + répétitions (force), une seule durée sans notion de séries (cardio), ou
 * séries + durée de maintien cible (planche, gainage…).
 */
export function PlanExerciseSheet({ exercise, initial, onConfirm, onClose }: PlanExerciseSheetProps) {
  const { t } = useApp()
  const isCardio = exercise.muscle === 'cardio'
  const isHold = exercise.trackingType === 'duration' && !isCardio
  const [sets, setSets] = useState(initial?.sets ?? 3)
  const [reps, setReps] = useState(initial?.reps ?? (isCardio ? '' : isHold ? '' : t('planEx.repsPlaceholder')))
  const [restSec, setRestSec] = useState(initial?.restSec ?? DEFAULT_REST_SEC)
  const [note, setNote] = useState(initial?.note ?? '')

  const submit = () => {
    const fallbackReps = isHold
      ? t('planEx.holdDurationPlaceholder')
      : isCardio
        ? t('planEx.durationPlaceholder')
        : t('planEx.repsPlaceholder')
    onConfirm({
      sets: isCardio ? 1 : sets,
      reps: reps.trim() || fallbackReps,
      note: note.trim() || undefined,
      restSec,
    })
    onClose()
  }

  const durationPlaceholder = isHold ? t('planEx.holdDurationPlaceholder') : t('planEx.durationPlaceholder')
  const durationField = (
    <div className="field">
      <label htmlFor="plan-ex-reps">{t('planEx.duration')}</label>
      <input
        id="plan-ex-reps"
        type="text"
        value={reps}
        onChange={(event) => setReps(event.target.value)}
        placeholder={durationPlaceholder}
      />
    </div>
  )

  return (
    <Sheet title={exerciseName(exercise, t)} subtitle={t('planEx.subtitle')} onClose={onClose}>
      <div className="stack">
        {exerciseMediaImages(exercise.id) ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
            <ExerciseInfoButton exercise={exercise} />
          </div>
        ) : null}
        {isCardio ? (
          durationField
        ) : isHold ? (
          <div className="grid-2">
            <NumberField id="plan-ex-sets" label={t('planEx.sets')} value={sets} onCommit={setSets} min={1} max={20} />
            {durationField}
          </div>
        ) : (
          <div className="grid-2">
            <NumberField id="plan-ex-sets" label={t('planEx.sets')} value={sets} onCommit={setSets} min={1} max={20} />
            <div className="field">
              <label htmlFor="plan-ex-reps">{t('planEx.reps')}</label>
              <input
                id="plan-ex-reps"
                type="text"
                value={reps}
                onChange={(event) => setReps(event.target.value)}
                placeholder={t('planEx.repsPlaceholder')}
              />
            </div>
          </div>
        )}
        <div className="field">
          <label>{t('planEx.rest')}</label>
          <div className="stepper">
            <button
              type="button"
              onClick={() => setRestSec((r) => Math.max(MIN_REST_SEC, r - REST_STEP_SEC))}
              aria-label={t('planEx.restDecrease')}
            >
              −
            </button>
            <span className="stepper-value">{formatRestTime(restSec)}</span>
            <button type="button" onClick={() => setRestSec((r) => r + REST_STEP_SEC)} aria-label={t('planEx.restIncrease')}>
              +
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="plan-ex-note">{t('planEx.note')}</label>
          <input
            id="plan-ex-note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('planEx.notePlaceholder')}
          />
        </div>
        <button type="button" className="btn" onClick={submit}>
          {initial ? t('planEx.update') : t('planEx.add')}
        </button>
      </div>
    </Sheet>
  )
}
