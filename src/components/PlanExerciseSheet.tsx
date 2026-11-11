import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from './FormPage'
import { NumberField } from './NumberField'
import { ExerciseInfoButton } from './ExerciseInfoButton'
import { exerciseMediaImages } from '../lib/exerciseMedia'
import { exerciseName } from '../lib/exercises'
import { todayKey } from '../lib/date'
import { displayWeightValue, fromDisplayWeight } from '../lib/weightUnit'
import { DEFAULT_REST_SEC, REST_STEP_SEC, MIN_REST_SEC, formatRestTime } from '../lib/rest'
import type { Exercise, PlanExercise } from '../lib/types'

interface PlanExerciseSheetProps {
  exercise: Exercise
  initial?: PlanExercise
  onConfirm: (entry: { sets: number; reps: string; note?: string; restSec: number; targetWeight?: number; targetWeightDate?: string }) => void
  onClose: () => void
}

/**
 * Objectif d'un exercice au sein d'un jour de programme. Trois formes : séries
 * + répétitions (force), une seule durée sans notion de séries (cardio), ou
 * séries + durée de maintien cible (planche, gainage…). Page à part entière
 * (plutôt qu'une feuille modale) pour éviter les sauts au clavier virtuel.
 */
export function PlanExerciseSheet({ exercise, initial, onConfirm, onClose }: PlanExerciseSheetProps) {
  const { t, units } = useApp()
  const isCardio = exercise.muscle === 'cardio'
  const isHold = exercise.trackingType === 'duration' && !isCardio
  const [sets, setSets] = useState(initial?.sets ?? 3)
  const [reps, setReps] = useState(initial?.reps ?? (isCardio ? '' : isHold ? '' : t('planEx.repsPlaceholder')))
  const [restSec, setRestSec] = useState(initial?.restSec ?? DEFAULT_REST_SEC)
  const [note, setNote] = useState(initial?.note ?? '')
  const [weightText, setWeightText] = useState(
    initial?.targetWeight ? String(displayWeightValue(initial.targetWeight, units.weight)) : '',
  )

  const submit = () => {
    const fallbackReps = isHold
      ? t('planEx.holdDurationPlaceholder')
      : isCardio
        ? t('planEx.durationPlaceholder')
        : t('planEx.repsPlaceholder')
    const parsedWeight = parseFloat(weightText.replace(',', '.'))
    const targetWeight =
      !isCardio && !isHold && Number.isFinite(parsedWeight) && parsedWeight > 0
        ? fromDisplayWeight(parsedWeight, units.weight)
        : undefined
    const unchanged =
      initial?.targetWeight !== undefined &&
      targetWeight !== undefined &&
      displayWeightValue(initial.targetWeight, units.weight) === displayWeightValue(targetWeight, units.weight)
    onConfirm({
      targetWeight: unchanged ? initial?.targetWeight : targetWeight,
      targetWeightDate: targetWeight === undefined ? undefined : unchanged ? initial?.targetWeightDate : todayKey(),
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
    <FormPage title={exerciseName(exercise, t)} subtitle={t('planEx.subtitle')} onBack={onClose}>
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
        {isCardio || isHold ? null : (
          <div className="field">
            <label htmlFor="plan-ex-weight">{t('planEx.targetWeight', { unit: units.weight })}</label>
            <input
              id="plan-ex-weight"
              type="text"
              inputMode="decimal"
              value={weightText}
              onChange={(event) => setWeightText(event.target.value)}
              placeholder="—"
            />
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
    </FormPage>
  )
}
