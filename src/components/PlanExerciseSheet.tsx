import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { NumberField } from './NumberField'
import { exerciseName } from '../lib/exercises'
import type { Exercise, PlanExercise } from '../lib/types'

interface PlanExerciseSheetProps {
  exercise: Exercise
  initial?: PlanExercise
  onConfirm: (entry: { sets: number; reps: string; note?: string }) => void
  onClose: () => void
}

/** Objectif d'un exercice au sein d'un jour de programme : séries, répétitions, note. */
export function PlanExerciseSheet({ exercise, initial, onConfirm, onClose }: PlanExerciseSheetProps) {
  const { t } = useApp()
  const [sets, setSets] = useState(initial?.sets ?? 3)
  const [reps, setReps] = useState(initial?.reps ?? t('planEx.repsPlaceholder'))
  const [note, setNote] = useState(initial?.note ?? '')

  const submit = () => {
    onConfirm({ sets, reps: reps.trim() || t('planEx.repsPlaceholder'), note: note.trim() || undefined })
    onClose()
  }

  return (
    <Sheet title={exerciseName(exercise, t)} subtitle={t('planEx.subtitle')} onClose={onClose}>
      <div className="stack">
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
