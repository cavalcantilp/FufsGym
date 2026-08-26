import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from './FormPage'
import { ExerciseInfoButton } from './ExerciseInfoButton'
import { MUSCLE_COLOR, MUSCLE_GROUPS, equipmentLabel, exerciseName, muscleLabel } from '../lib/exercises'
import { IconPlus, IconStar } from './icons'
import type { Exercise, MuscleGroup } from '../lib/types'

interface ExercisePickerProps {
  title: string
  onPick: (exercise: Exercise) => void
  onClose: () => void
}

/**
 * Page plein écran de recherche/sélection d'exercice (plutôt qu'une feuille
 * modale) pour éviter les sauts au clavier virtuel. Filtre par groupe
 * musculaire, favoris en tête de liste, création rapide.
 */
export function ExercisePicker({ title, onPick, onClose }: ExercisePickerProps) {
  const { t, exercises, addCustomExercise, favoriteExerciseIds, toggleFavoriteExercise } = useApp()
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
      .sort((a, b) => {
        const favA = favoriteExerciseIds.includes(a.exercise.id)
        const favB = favoriteExerciseIds.includes(b.exercise.id)
        if (favA !== favB) return favA ? -1 : 1
        return a.label.localeCompare(b.label)
      })
  }, [exercises, muscle, query, t, favoriteExerciseIds])

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    const created = addCustomExercise({ name, muscle: newMuscle })
    onPick(created)
  }

  return (
    <FormPage title={title} onBack={onClose}>
      <div className="stack">
        <input
          type="text"
          placeholder={t('picker.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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
                results.map(({ exercise, label }) => {
                  const isFavorite = favoriteExerciseIds.includes(exercise.id)
                  return (
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
                      <button
                        type="button"
                        className={`icon-btn favorite-btn${isFavorite ? ' active' : ''}`}
                        onClick={() => toggleFavoriteExercise(exercise.id)}
                        aria-label={isFavorite ? t('picker.unfavorite') : t('picker.favorite')}
                      >
                        <IconStar size={17} filled={isFavorite} />
                      </button>
                      <ExerciseInfoButton exercise={exercise} />
                    </div>
                  )
                })
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
    </FormPage>
  )
}
