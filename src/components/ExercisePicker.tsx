import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { ExerciseInfoButton } from './ExerciseInfoButton'
import { MUSCLE_COLOR, MUSCLE_GROUPS, equipmentLabel, exerciseName, muscleLabel } from '../lib/exercises'
import { IconPlus } from './icons'
import type { Exercise, MuscleGroup } from '../lib/types'

interface ExercisePickerProps {
  title: string
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

/** Feuille de recherche/sélection d'exercice, avec filtre par groupe musculaire et création rapide. */
export function ExercisePicker({ title, onPick, onClose }: ExercisePickerProps) {
  const { t, exercises, addCustomExercise } = useApp()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('chest')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((exercise) => muscle === 'all' || exercise.muscle === muscle)
      .map((exercise) => ({ exercise, label: exerciseName(exercise, t) }))
      .filter(({ label }) => !q || label.toLowerCase().includes(q))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [exercises, muscle, query, t])

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    const created = addCustomExercise({ name, muscle: newMuscle })
    onPick(created)
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="stack">
        <input
          type="text"
          placeholder={t('picker.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />

        <div className="chips">
          <button type="button" className={`chip${muscle === 'all' ? ' active' : ''}`} onClick={() => setMuscle('all')}>
            {t('picker.all')}
          </button>
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              className={`chip${muscle === group ? ' active' : ''}`}
              onClick={() => setMuscle(group)}
            >
              {muscleLabel(group, t)}
            </button>
          ))}
        </div>

        {creating ? (
          <div className="stack">
            <div className="field">
              <label htmlFor="new-ex-name">{t('picker.newName')}</label>
              <input
                id="new-ex-name"
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="new-ex-muscle">{t('picker.newMuscle')}</label>
              <select
                id="new-ex-muscle"
                value={newMuscle}
                onChange={(event) => setNewMuscle(event.target.value as MuscleGroup)}
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {muscleLabel(group, t)}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn" onClick={handleCreate} disabled={!newName.trim()}>
              {t('picker.addThis')}
            </button>
          </div>
        ) : (
          <>
            <div className="exercise-list">
              {results.length ? (
                results.map(({ exercise, label }) => (
                  <div key={exercise.id} className="exercise-row">
                    <button type="button" className="exercise-row-main" onClick={() => onPick(exercise)}>
                      <span className="muscle-dot" style={{ background: MUSCLE_COLOR[exercise.muscle] }} />
                      <span className="info">
                        <span className="name">{label}</span>
                        <span className="muscle">
                          {muscleLabel(exercise.muscle, t)}
                          {exercise.equipment ? ` · ${equipmentLabel(exercise.equipment, t)}` : ''}
                        </span>
                      </span>
                    </button>
                    <ExerciseInfoButton exercise={exercise} />
                  </div>
                ))
              ) : (
                <p className="empty">{t('picker.empty')}</p>
              )}
            </div>
            <button type="button" className="btn secondary" onClick={() => { setNewName(query); setCreating(true) }}>
              <IconPlus size={18} />
              {t('picker.createCustom')}
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}
