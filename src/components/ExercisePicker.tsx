import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { MUSCLE_COLOR, MUSCLE_GROUPS, MUSCLE_LABEL } from '../lib/exercises'
import { IconPlus } from './icons'
import type { Exercise, MuscleGroup } from '../lib/types'

interface ExercisePickerProps {
  title: string
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

/** Feuille de recherche/sélection d'exercice, avec filtre par groupe musculaire et création rapide. */
export function ExercisePicker({ title, onPick, onClose }: ExercisePickerProps) {
  const { exercises, addCustomExercise } = useApp()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('chest')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter((exercise) => muscle === 'all' || exercise.muscle === muscle)
      .filter((exercise) => !q || exercise.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, muscle, query])

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
          placeholder="Rechercher un exercice…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />

        <div className="chips">
          <button type="button" className={`chip${muscle === 'all' ? ' active' : ''}`} onClick={() => setMuscle('all')}>
            Tous
          </button>
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              className={`chip${muscle === group ? ' active' : ''}`}
              onClick={() => setMuscle(group)}
            >
              {MUSCLE_LABEL[group]}
            </button>
          ))}
        </div>

        {creating ? (
          <div className="stack">
            <div className="field">
              <label htmlFor="new-ex-name">Nom de l'exercice</label>
              <input
                id="new-ex-name"
                type="text"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="new-ex-muscle">Groupe musculaire</label>
              <select
                id="new-ex-muscle"
                value={newMuscle}
                onChange={(event) => setNewMuscle(event.target.value as MuscleGroup)}
              >
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {MUSCLE_LABEL[group]}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn" onClick={handleCreate} disabled={!newName.trim()}>
              Ajouter cet exercice
            </button>
          </div>
        ) : (
          <>
            <div className="exercise-list">
              {results.length ? (
                results.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    className="exercise-row"
                    onClick={() => onPick(exercise)}
                  >
                    <span className="muscle-dot" style={{ background: MUSCLE_COLOR[exercise.muscle] }} />
                    <span className="info">
                      <span className="name">{exercise.name}</span>
                      <span className="muscle">
                        {MUSCLE_LABEL[exercise.muscle]}
                        {exercise.equipment ? ` · ${exercise.equipment}` : ''}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="empty">Aucun exercice trouvé.</p>
              )}
            </div>
            <button type="button" className="btn secondary" onClick={() => { setNewName(query); setCreating(true) }}>
              <IconPlus size={18} />
              Créer un exercice personnalisé
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}
