import { Fragment, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { PlanExerciseSheet } from '../components/PlanExerciseSheet'
import { MuscleDiagram } from '../components/MuscleDiagram'
import { ScheduleScreen } from './ScheduleScreen'
import { MUSCLE_COLOR, exerciseName } from '../lib/exercises'
import { aggregateActivation } from '../lib/exerciseActivation'
import { ACTIVATION_STOPS, NEUTRAL_MUSCLE_COLOR, interpolateColor } from '../lib/colorScale'
import { DEFAULT_REST_SEC, formatRestTime } from '../lib/rest'
import { groupBySuperset } from '../lib/superset'
import { IconArrowDown, IconArrowUp, IconCalendarCheck, IconCheck, IconEdit, IconPlus, IconTrash } from '../components/icons'
import type { Exercise, PlanExercise, Workout } from '../lib/types'

interface EditingEntry {
  entry: PlanExercise
}

function WorkoutDetail({
  workout,
  onBack,
  onSchedule,
}: {
  workout: Workout
  onBack: () => void
  onSchedule: () => void
}) {
  const {
    t,
    scheduleForWorkout,
    renameWorkout,
    removeWorkout,
    addExercise,
    updateExercise,
    removeExercise,
    moveExercise,
    exerciseById,
  } = useApp()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingPick, setPendingPick] = useState<Exercise | null>(null)
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null)
  const [addingSuperset, setAddingSuperset] = useState(false)
  const [nameDraft, setNameDraft] = useState(workout.name)

  const hasSchedule = Boolean(scheduleForWorkout(workout.id))
  const trimmedDraft = nameDraft.trim()
  const nameDirty = trimmedDraft !== '' && trimmedDraft !== workout.name

  const activation = useMemo(
    () => aggregateActivation(workout.exercises.map((entry) => entry.exerciseId)),
    [workout.exercises],
  )
  const colorForMuscle = (muscleId: string) => {
    const intensity = activation[muscleId] ?? 0
    return intensity > 0 ? interpolateColor(ACTIVATION_STOPS, intensity) : NEUTRAL_MUSCLE_COLOR
  }

  const saveName = () => {
    if (!trimmedDraft) return
    renameWorkout(workout.id, trimmedDraft)
  }

  /** Retour sans garder de trace : un entraînement fraîchement créé, jamais renommé ni complété, ne doit pas polluer la liste. */
  const handleBack = () => {
    if (workout.exercises.length === 0 && workout.name === t('workout.new')) {
      removeWorkout(workout.id)
    }
    onBack()
  }

  const nameField = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="text"
        className="plan-name-input"
        value={nameDraft}
        aria-label={t('workout.newName')}
        onChange={(event) => setNameDraft(event.target.value)}
        onBlur={() => {
          if (!nameDraft.trim()) setNameDraft(workout.name)
        }}
      />
      {nameDirty ? (
        <button type="button" className="name-save-btn" onClick={saveName} aria-label={t('workout.saveName')}>
          <IconCheck size={16} />
        </button>
      ) : null}
    </span>
  )

  if (pickerOpen) {
    return (
      <ExercisePicker
        title={t('picker.addTitle')}
        onClose={() => setPickerOpen(false)}
        onPick={(exercise) => {
          setPendingPick(exercise)
          setPickerOpen(false)
        }}
      />
    )
  }

  if (pendingPick) {
    return (
      <PlanExerciseSheet
        exercise={pendingPick}
        onConfirm={(target) => addExercise(workout.id, { exerciseId: pendingPick.id, ...target })}
        onClose={() => setPendingPick(null)}
      />
    )
  }

  if (editingEntry) {
    return (
      <PlanExerciseSheet
        exercise={exerciseById(editingEntry.entry.exerciseId) ?? { id: '', name: t('exercise.unknown'), muscle: 'chest', custom: true }}
        initial={editingEntry.entry}
        onConfirm={(target) => updateExercise(workout.id, editingEntry.entry.id, target)}
        onClose={() => setEditingEntry(null)}
      />
    )
  }

  if (addingSuperset) {
    return <AddSupersetFlow workoutId={workout.id} onClose={() => setAddingSuperset(false)} />
  }

  return (
    <FormPage
      title={nameField}
      backLabel={workout.name}
      subtitle={`${workout.exercises.length} ${t('unit.exercise')}`}
      onBack={handleBack}
    >
      <div className="stack">
        <div className="day-card">
          {workout.exercises.length === 0 ? (
            <p className="empty">{t('workout.noExercises')}</p>
          ) : (
            groupBySuperset(workout.exercises).map((group, groupIndex, groups) => {
              const isFirstGroup = groupIndex === 0
              const isLastGroup = groupIndex === groups.length - 1
              const rows = group.map((entry) => {
                const info = exerciseById(entry.exerciseId)
                return (
                  <div className="plan-exercise-row" key={entry.id}>
                    <span className="muscle-dot" style={{ background: info ? MUSCLE_COLOR[info.muscle] : 'var(--border)' }} />
                    <span className="info">
                      <span className="name">{info ? exerciseName(info, t) : ''}</span>
                      <span className="target">
                        {info?.muscle === 'cardio' ? entry.reps : `${entry.sets} × ${entry.reps}`} ·{' '}
                        {formatRestTime(entry.restSec ?? DEFAULT_REST_SEC)}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </span>
                    </span>
                    <span className="reorder-btns">
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={isFirstGroup}
                        onClick={() => moveExercise(workout.id, entry.id, 'up')}
                        aria-label={t('day.moveUpAria')}
                      >
                        <IconArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={isLastGroup}
                        onClick={() => moveExercise(workout.id, entry.id, 'down')}
                        aria-label={t('day.moveDownAria')}
                      >
                        <IconArrowDown size={14} />
                      </button>
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setEditingEntry({ entry })}
                      aria-label={t('day.editAria')}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removeExercise(workout.id, entry.id)}
                      aria-label={t('day.removeAria')}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )
              })

              if (group.length === 1) return <Fragment key={group[0].id}>{rows}</Fragment>

              return (
                <div className="superset-group" key={group[0].id}>
                  <div className="superset-group-label">{t('train.supersetLabel', { count: group.length })}</div>
                  {rows}
                </div>
              )
            })
          )}

          <button type="button" className="day-add" onClick={() => setPickerOpen(true)}>
            <IconPlus size={16} />
            {t('workout.addExercise')}
          </button>
          <button type="button" className="day-add" onClick={() => setAddingSuperset(true)}>
            <IconPlus size={16} />
            {t('workout.addSuperset')}
          </button>
        </div>

        <div className="card">
          <div className="card-title">{t('exerciseInfo.muscleTitle')}</div>
          <MuscleDiagram colorFor={colorForMuscle} />
          <div className="legend">
            <span className="legend-label">{t('exerciseInfo.legendLow')}</span>
            <span className="legend-bar" />
            <span className="legend-label">{t('exerciseInfo.legendHigh')}</span>
          </div>
        </div>

        <button type="button" className={hasSchedule ? 'btn secondary' : 'btn'} onClick={onSchedule}>
          {hasSchedule ? t('schedule.edit') : t('workout.activate')}
        </button>

        <button type="button" className="btn success" onClick={handleBack}>
          {t('workout.save')}
        </button>

        <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
          {t('workout.deleteThis')}
        </button>
      </div>

      {confirmDelete ? (
        <Sheet title={t('workout.deleteConfirmTitle')} subtitle={workout.name} onClose={() => setConfirmDelete(false)}>
          <div className="stack">
            <p className="hint">{t('workout.deleteConfirmBody')}</p>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                removeWorkout(workout.id)
                setConfirmDelete(false)
                onBack()
              }}
            >
              {t('workout.delete')}
            </button>
          </div>
        </Sheet>
      ) : null}
    </FormPage>
  )
}

export function PlanificationScreen() {
  const { t, workouts, schedules, addWorkout } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [pickerForNew, setPickerForNew] = useState<string | null>(null)

  const scheduling = workouts.find((w) => w.id === schedulingId)
  if (scheduling) {
    return <ScheduleScreen workout={scheduling} onBack={() => setSchedulingId(null)} />
  }

  const selected = workouts.find((w) => w.id === selectedId)
  if (selected) {
    return (
      <WorkoutDetail workout={selected} onBack={() => setSelectedId(null)} onSchedule={() => setSchedulingId(selected.id)} />
    )
  }

  if (pickerForNew) {
    return (
      <NewWorkoutPicker
        workoutId={pickerForNew}
        onClose={() => {
          setSelectedId(pickerForNew)
          setPickerForNew(null)
        }}
      />
    )
  }

  const workoutHasSchedule = (workoutId: string) => schedules.some((s) => s.workoutId === workoutId)

  const handleCreate = () => {
    const created = addWorkout(t('workout.new'))
    setPickerForNew(created.id)
  }

  return (
    <div className="screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('workout.title')}</h2>
        <p className="hint" style={{ marginTop: 4 }}>{t('workout.subtitle')}</p>
      </div>

      {workouts.length === 0 ? (
        <div className="card">
          <p className="empty">{t('workout.empty')}</p>
        </div>
      ) : (
        <div className="stack">
          {workouts.map((workout) => (
            <button key={workout.id} type="button" className="plan-card" onClick={() => setSelectedId(workout.id)}>
              <div className="plan-card-head">
                <span className="name">{workout.name}</span>
                {workoutHasSchedule(workout.id) ? (
                  <span className="schedule-indicator" title={t('workout.active')} aria-label={t('workout.active')}>
                    <IconCalendarCheck size={16} />
                  </span>
                ) : null}
              </div>
              <span className="days-sub">
                {workout.exercises.length} {t('unit.exercise')}
              </span>
            </button>
          ))}
        </div>
      )}

      <button type="button" className="btn" onClick={handleCreate}>
        <IconPlus size={18} />
        {t('workout.new')}
      </button>
    </div>
  )
}

/** Ouvre directement le sélecteur d'exercice pour un entraînement fraîchement créé, sans navigation intermédiaire. */
function NewWorkoutPicker({ workoutId, onClose }: { workoutId: string; onClose: () => void }) {
  const { t, addExercise } = useApp()
  const [pendingPick, setPendingPick] = useState<Exercise | null>(null)

  if (pendingPick) {
    return (
      <PlanExerciseSheet
        exercise={pendingPick}
        onConfirm={(target) => addExercise(workoutId, { exerciseId: pendingPick.id, ...target })}
        onClose={() => {
          setPendingPick(null)
          onClose()
        }}
      />
    )
  }

  return (
    <ExercisePicker
      title={t('picker.addTitle')}
      onClose={onClose}
      onPick={(exercise) => setPendingPick(exercise)}
    />
  )
}

type SupersetStep = { kind: 'picking' } | { kind: 'configuring'; exercise: Exercise } | { kind: 'prompt' }

/**
 * Ajoute plusieurs exercices enchaînés (superset) : sélection puis réglages
 * en boucle, chaque nouvel ajout marquant le précédent comme lié au suivant.
 */
function AddSupersetFlow({ workoutId, onClose }: { workoutId: string; onClose: () => void }) {
  const { t, addExercise, setSupersetLink } = useApp()
  const [step, setStep] = useState<SupersetStep>({ kind: 'picking' })
  const lastAddedId = useRef<string | null>(null)
  const addedCount = useRef(0)

  if (step.kind === 'picking') {
    return (
      <ExercisePicker
        title={t('picker.addTitle')}
        onClose={() => (addedCount.current === 0 ? onClose() : setStep({ kind: 'prompt' }))}
        onPick={(exercise) => setStep({ kind: 'configuring', exercise })}
      />
    )
  }

  if (step.kind === 'configuring') {
    const exercise = step.exercise
    return (
      <PlanExerciseSheet
        exercise={exercise}
        onConfirm={(target) => {
          const created = addExercise(workoutId, { exerciseId: exercise.id, ...target })
          if (lastAddedId.current) setSupersetLink(workoutId, lastAddedId.current, true)
          lastAddedId.current = created.id
          addedCount.current += 1
        }}
        onClose={() => setStep({ kind: 'prompt' })}
      />
    )
  }

  return (
    <Sheet title={t('workout.supersetPromptTitle')} onClose={onClose}>
      <div className="stack">
        <p className="hint">{t('workout.supersetPromptBody')}</p>
        <button type="button" className="btn" onClick={() => setStep({ kind: 'picking' })}>
          <IconPlus size={18} />
          {t('workout.addExercise')}
        </button>
        <button type="button" className="btn secondary" onClick={onClose}>
          {t('workout.supersetFinish')}
        </button>
      </div>
    </Sheet>
  )
}
