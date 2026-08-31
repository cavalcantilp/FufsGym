import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { IconCheck, IconEdit } from './icons'
import { exerciseName, formatSetSummary } from '../lib/exercises'
import { formatLong } from '../lib/date'
import type { Exercise } from '../lib/types'

interface ExerciseNoteHistoryProps {
  exercise: Exercise
  /** Date de la séance en cours : la note du jour s'y rattache. */
  sessionDate: string
  onClose: () => void
}

/** Note du jour éditable, puis historique des notes précédentes avec la charge faite ce jour-là. */
export function ExerciseNoteHistory({ exercise, sessionDate, onClose }: ExerciseNoteHistoryProps) {
  const { t, lang, units, sessions, exerciseNotes, setExerciseNote } = useApp()
  const notesForExercise = exerciseNotes[exercise.id] ?? {}
  const savedToday = notesForExercise[sessionDate] ?? ''
  const [editing, setEditing] = useState(!savedToday)
  const [draft, setDraft] = useState(savedToday)

  const chargeForDate = (date: string): string | null => {
    const sets = sessions
      .filter((session) => session.date === date)
      .flatMap((session) => session.exercises.filter((entry) => entry.exerciseId === exercise.id))
      .flatMap((entry) => entry.sets.filter((set) => set.done))
    if (!sets.length) return null
    return sets.map((set) => formatSetSummary(set, exercise, units.weight)).join(', ')
  }

  const history = useMemo(
    () =>
      Object.entries(notesForExercise)
        .filter(([date]) => date !== sessionDate)
        .sort((a, b) => b[0].localeCompare(a[0])),
    [notesForExercise, sessionDate],
  )

  const save = () => {
    const text = draft.trim()
    setExerciseNote(exercise.id, sessionDate, text)
    setEditing(!text)
  }

  return (
    <Sheet title={t('train.exerciseNoteHistoryTitle')} subtitle={exerciseName(exercise, t)} onClose={onClose} centered>
      <div className="stack">
        <div className="field">
          <label htmlFor="exercise-note-today">{t('train.exerciseNoteLabel')}</label>
          {editing ? (
            <textarea
              id="exercise-note-today"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('train.exerciseNotePlaceholder')}
            />
          ) : (
            <p className="hint">{savedToday}</p>
          )}
        </div>
        {editing ? (
          <button type="button" className="btn" onClick={save}>
            <IconCheck size={16} />
            {t('train.exerciseNoteSave')}
          </button>
        ) : (
          <button type="button" className="btn secondary" onClick={() => setEditing(true)}>
            <IconEdit size={16} />
            {t('train.exerciseNoteEdit')}
          </button>
        )}

        <div className="stack">
          <span className="info-section-title">{t('train.exerciseNoteHistorySection')}</span>
          {history.length === 0 ? (
            <p className="empty">{t('train.exerciseNoteHistoryEmpty')}</p>
          ) : (
            history.map(([date, text]) => {
              const charge = chargeForDate(date)
              return (
                <div className="card" key={date}>
                  <div className="plan-card-head">
                    <span className="name">{formatLong(date, lang)}</span>
                  </div>
                  <p className="hint">{text}</p>
                  {charge ? <p className="hint">{t('train.exerciseNoteCharge', { charge })}</p> : null}
                </div>
              )
            })
          )}
        </div>
      </div>
    </Sheet>
  )
}
