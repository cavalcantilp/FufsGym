import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { Sheet } from '../components/Sheet'
import { TextPromptSheet } from '../components/TextPromptSheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { PlanExerciseSheet } from '../components/PlanExerciseSheet'
import { MUSCLE_COLOR, exerciseName } from '../lib/exercises'
import { IconEdit, IconPlus, IconTrash } from '../components/icons'
import type { Exercise, Plan, PlanDay, PlanExercise } from '../lib/types'

type PendingPick = { dayId: string; exercise: Exercise } | null
type EditingEntry = { dayId: string; entry: PlanExercise } | null

function PlanDetail({ plan, onBack }: { plan: Plan; onBack: () => void }) {
  const {
    t,
    activePlanId,
    setActivePlan,
    renamePlan,
    removePlan,
    addDay,
    renameDay,
    removeDay,
    addPlanExercise,
    updatePlanExercise,
    removePlanExercise,
    exerciseById,
  } = useApp()

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addingDay, setAddingDay] = useState(false)
  const [renamingDay, setRenamingDay] = useState<PlanDay | null>(null)
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)
  const [pendingPick, setPendingPick] = useState<PendingPick>(null)
  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null)

  const isActive = activePlanId === plan.id

  const nameField = (
    <input
      type="text"
      className="plan-name-input"
      value={plan.name}
      aria-label={t('plan.newName')}
      onChange={(event) => renamePlan(plan.id, event.target.value)}
      onBlur={(event) => {
        if (!event.target.value.trim()) renamePlan(plan.id, t('plan.new'))
      }}
    />
  )

  return (
    <FormPage
      title={nameField}
      backLabel={plan.name}
      subtitle={`${plan.days.length} ${t('unit.day')}`}
      onBack={onBack}
    >
      <div className="stack">
        <button
          type="button"
          className={isActive ? 'btn secondary' : 'btn'}
          onClick={() => setActivePlan(isActive ? null : plan.id)}
        >
          {isActive ? t('plan.activated') : t('plan.activate')}
        </button>

        {plan.days.map((day) => (
          <div className="day-card" key={day.id}>
            <div className="day-card-head">
              <span className="name">{day.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="count">{day.exercises.length} {t('unit.exercise')}</span>
                <button type="button" className="icon-btn" onClick={() => setRenamingDay(day)} aria-label={t('day.renameAria')}>
                  <IconEdit size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeDay(plan.id, day.id)}
                  aria-label={t('day.deleteAria')}
                >
                  <IconTrash size={15} />
                </button>
              </span>
            </div>

            {day.exercises.length === 0 ? (
              <p className="empty">{t('day.noExercises')}</p>
            ) : (
              day.exercises.map((entry) => {
                const info = exerciseById(entry.exerciseId)
                return (
                  <div className="plan-exercise-row" key={entry.id}>
                    <span className="muscle-dot" style={{ background: info ? MUSCLE_COLOR[info.muscle] : 'var(--border)' }} />
                    <span className="info">
                      <span className="name">{info ? exerciseName(info, t) : ''}</span>
                      <span className="target">
                        {entry.sets} × {entry.reps}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setEditingEntry({ dayId: day.id, entry })}
                      aria-label={t('day.editAria')}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removePlanExercise(plan.id, day.id, entry.id)}
                      aria-label={t('day.removeAria')}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )
              })
            )}

            <button type="button" className="day-add" onClick={() => setPickerDayId(day.id)}>
              <IconPlus size={16} />
              {t('day.addExercise')}
            </button>
          </div>
        ))}

        <button type="button" className="btn secondary" onClick={() => setAddingDay(true)}>
          <IconPlus size={18} />
          {t('day.addDay')}
        </button>

        <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
          {t('plan.deleteThis')}
        </button>
      </div>

      {addingDay ? (
        <TextPromptSheet
          title={t('day.new')}
          label={t('day.newName')}
          confirmLabel={t('day.add')}
          onConfirm={(name) => addDay(plan.id, name)}
          onClose={() => setAddingDay(false)}
        />
      ) : null}

      {renamingDay ? (
        <TextPromptSheet
          title={t('day.renameTitle')}
          label={t('day.newName')}
          initial={renamingDay.name}
          onConfirm={(name) => renameDay(plan.id, renamingDay.id, name)}
          onClose={() => setRenamingDay(null)}
        />
      ) : null}

      {pickerDayId ? (
        <ExercisePicker
          title={t('picker.addTitle')}
          onClose={() => setPickerDayId(null)}
          onPick={(exercise) => {
            setPendingPick({ dayId: pickerDayId, exercise })
            setPickerDayId(null)
          }}
        />
      ) : null}

      {pendingPick ? (
        <PlanExerciseSheet
          exercise={pendingPick.exercise}
          onConfirm={(target) => addPlanExercise(plan.id, pendingPick.dayId, { exerciseId: pendingPick.exercise.id, ...target })}
          onClose={() => setPendingPick(null)}
        />
      ) : null}

      {editingEntry ? (
        <PlanExerciseSheet
          exercise={exerciseById(editingEntry.entry.exerciseId) ?? { id: '', name: t('exercise.unknown'), muscle: 'chest', custom: true }}
          initial={editingEntry.entry}
          onConfirm={(target) => updatePlanExercise(plan.id, editingEntry.dayId, editingEntry.entry.id, target)}
          onClose={() => setEditingEntry(null)}
        />
      ) : null}

      {confirmDelete ? (
        <Sheet title={t('plan.deleteConfirmTitle')} subtitle={plan.name} onClose={() => setConfirmDelete(false)}>
          <div className="stack">
            <p className="hint">{t('plan.deleteConfirmBody')}</p>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                removePlan(plan.id)
                setConfirmDelete(false)
                onBack()
              }}
            >
              {t('plan.delete')}
            </button>
          </div>
        </Sheet>
      ) : null}
    </FormPage>
  )
}

export function PlanificationScreen() {
  const { t, plans, activePlanId, addPlan } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = plans.find((p) => p.id === selectedId)
  if (selected) return <PlanDetail plan={selected} onBack={() => setSelectedId(null)} />

  return (
    <div className="screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('plan.title')}</h2>
        <p className="hint" style={{ marginTop: 4 }}>{t('plan.subtitle')}</p>
      </div>

      {plans.length === 0 ? (
        <div className="card">
          <p className="empty">{t('plan.empty')}</p>
        </div>
      ) : (
        <div className="stack">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              className={`plan-card${activePlanId === plan.id ? ' active' : ''}`}
              onClick={() => setSelectedId(plan.id)}
            >
              <div className="plan-card-head">
                <span className="name">{plan.name}</span>
                {activePlanId === plan.id ? <span className="active-badge">{t('plan.active')}</span> : null}
              </div>
              <span className="days-sub">
                {plan.days.length === 0 ? t('plan.noDays') : plan.days.map((day) => day.name).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}

      <button type="button" className="btn" onClick={() => setSelectedId(addPlan(t('plan.new')).id)}>
        <IconPlus size={18} />
        {t('plan.new')}
      </button>
    </div>
  )
}
