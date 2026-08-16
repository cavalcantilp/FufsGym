import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { PlanExerciseSheet } from '../components/PlanExerciseSheet'
import { ScheduleScreen } from './ScheduleScreen'
import { MUSCLE_COLOR, exerciseName } from '../lib/exercises'
import { DEFAULT_REST_SEC, formatRestTime } from '../lib/rest'
import { IconCalendarCheck, IconEdit, IconPlus, IconTrash } from '../components/icons'
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
  const { t, scheduleForWorkout, renameWorkout, removeWorkout, addExercise, updateExercise, removeExercise, exerciseById } =
    useApp()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingPick, setPendingPick] = useState<Exercise | null>(null)
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null)

  const hasSchedule = Boolean(scheduleForWorkout(workout.id))

  const nameField = (
    <input
      type="text"
      className="plan-name-input"
      value={workout.name}
      aria-label={t('workout.newName')}
      onChange={(event) => renameWorkout(workout.id, event.target.value)}
      onBlur={(event) => {
        if (!event.target.value.trim()) renameWorkout(workout.id, t('workout.new'))
      }}
    />
  )

  return (
    <FormPage
      title={nameField}
      backLabel={workout.name}
      subtitle={`${workout.exercises.length} ${t('unit.exercise')}`}
      onBack={onBack}
    >
      <div className="stack">
        <div className="day-card">
          {workout.exercises.length === 0 ? (
            <p className="empty">{t('workout.noExercises')}</p>
          ) : (
            workout.exercises.map((entry) => {
              const info = exerciseById(entry.exerciseId)
              return (
                <div className="plan-exercise-row" key={entry.id}>
                  <span className="muscle-dot" style={{ background: info ? MUSCLE_COLOR[info.muscle] : 'var(--border)' }} />
                  <span className="info">
                    <span className="name">{info ? exerciseName(info, t) : ''}</span>
                    <span className="target">
                      {entry.sets} × {entry.reps} · {formatRestTime(entry.restSec ?? DEFAULT_REST_SEC)}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </span>
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
          )}

          <button type="button" className="day-add" onClick={() => setPickerOpen(true)}>
            <IconPlus size={16} />
            {t('workout.addExercise')}
          </button>
        </div>

        <button type="button" className={hasSchedule ? 'btn secondary' : 'btn'} onClick={onSchedule}>
          {hasSchedule ? t('schedule.edit') : t('workout.activate')}
        </button>

        <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
          {t('workout.deleteThis')}
        </button>
      </div>

      {pickerOpen ? (
        <ExercisePicker
          title={t('picker.addTitle')}
          onClose={() => setPickerOpen(false)}
          onPick={(exercise) => {
            setPendingPick(exercise)
            setPickerOpen(false)
          }}
        />
      ) : null}

      {pendingPick ? (
        <PlanExerciseSheet
          exercise={pendingPick}
          onConfirm={(target) => addExercise(workout.id, { exerciseId: pendingPick.id, ...target })}
          onClose={() => setPendingPick(null)}
        />
      ) : null}

      {editingEntry ? (
        <PlanExerciseSheet
          exercise={exerciseById(editingEntry.entry.exerciseId) ?? { id: '', name: t('exercise.unknown'), muscle: 'chest', custom: true }}
          initial={editingEntry.entry}
          onConfirm={(target) => updateExercise(workout.id, editingEntry.entry.id, target)}
          onClose={() => setEditingEntry(null)}
        />
      ) : null}

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

      {pickerForNew ? (
        <NewWorkoutPicker
          workoutId={pickerForNew}
          onClose={() => {
            setSelectedId(pickerForNew)
            setPickerForNew(null)
          }}
        />
      ) : null}
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
