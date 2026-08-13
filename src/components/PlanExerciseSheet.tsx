import { useState } from 'react'
import { Sheet } from './Sheet'
import { NumberField } from './NumberField'
import type { Exercise, PlanExercise } from '../lib/types'

interface PlanExerciseSheetProps {
  exercise: Exercise
  initial?: PlanExercise
  onConfirm: (entry: { sets: number; reps: string; note?: string }) => void
  onClose: () => void
}

/** Objectif d'un exercice au sein d'un jour de programme : séries, répétitions, note. */
export function PlanExerciseSheet({ exercise, initial, onConfirm, onClose }: PlanExerciseSheetProps) {
  const [sets, setSets] = useState(initial?.sets ?? 3)
  const [reps, setReps] = useState(initial?.reps ?? '8-12')
  const [note, setNote] = useState(initial?.note ?? '')

  const submit = () => {
    onConfirm({ sets, reps: reps.trim() || '8-12', note: note.trim() || undefined })
    onClose()
  }

  return (
    <Sheet title={exercise.name} subtitle="Objectif pour ce jour" onClose={onClose}>
      <div className="stack">
        <div className="grid-2">
          <NumberField id="plan-ex-sets" label="Séries" value={sets} onCommit={setSets} min={1} max={20} />
          <div className="field">
            <label htmlFor="plan-ex-reps">Répétitions</label>
            <input id="plan-ex-reps" type="text" value={reps} onChange={(event) => setReps(event.target.value)} placeholder="8-12" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="plan-ex-note">Note (facultatif)</label>
          <input id="plan-ex-note" type="text" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ex. tempo lent, échec sur la dernière série…" />
        </div>
        <button type="button" className="btn" onClick={submit}>
          {initial ? 'Mettre à jour' : "Ajouter à ce jour"}
        </button>
      </div>
    </Sheet>
  )
}
