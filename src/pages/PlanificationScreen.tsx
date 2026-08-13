import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { Sheet } from '../components/Sheet'
import { TextPromptSheet } from '../components/TextPromptSheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { PlanExerciseSheet } from '../components/PlanExerciseSheet'
import { MUSCLE_COLOR } from '../lib/exercises'
import { IconEdit, IconPlus, IconTrash } from '../components/icons'
import type { Exercise, Plan, PlanDay, PlanExercise } from '../lib/types'

type PendingPick = { dayId: string; exercise: Exercise } | null
type EditingEntry = { dayId: string; entry: PlanExercise } | null

function PlanDetail({ plan, onBack }: { plan: Plan; onBack: () => void }) {
  const {
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

  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addingDay, setAddingDay] = useState(false)
  const [renamingDay, setRenamingDay] = useState<PlanDay | null>(null)
  const [pickerDayId, setPickerDayId] = useState<string | null>(null)
  const [pendingPick, setPendingPick] = useState<PendingPick>(null)
  const [editingEntry, setEditingEntry] = useState<EditingEntry>(null)

  const isActive = activePlanId === plan.id

  return (
    <FormPage title={plan.name} subtitle={`${plan.days.length} jour${plan.days.length > 1 ? 's' : ''}`} onBack={onBack}>
      <div className="stack">
        <div className="grid-2">
          <button
            type="button"
            className={isActive ? 'btn secondary' : 'btn'}
            onClick={() => setActivePlan(isActive ? null : plan.id)}
          >
            {isActive ? 'Programme actif ✓' : 'Activer ce programme'}
          </button>
          <button type="button" className="btn secondary" onClick={() => setRenaming(true)}>
            <IconEdit size={16} />
            Renommer
          </button>
        </div>

        {plan.days.map((day) => (
          <div className="day-card" key={day.id}>
            <div className="day-card-head">
              <span className="name">{day.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="count">{day.exercises.length} exercice{day.exercises.length > 1 ? 's' : ''}</span>
                <button type="button" className="icon-btn" onClick={() => setRenamingDay(day)} aria-label="Renommer ce jour">
                  <IconEdit size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeDay(plan.id, day.id)}
                  aria-label="Supprimer ce jour"
                >
                  <IconTrash size={15} />
                </button>
              </span>
            </div>

            {day.exercises.length === 0 ? (
              <p className="empty">Aucun exercice pour ce jour.</p>
            ) : (
              day.exercises.map((entry) => {
                const info = exerciseById(entry.exerciseId)
                return (
                  <div className="plan-exercise-row" key={entry.id}>
                    <span className="muscle-dot" style={{ background: info ? MUSCLE_COLOR[info.muscle] : 'var(--border)' }} />
                    <span className="info">
                      <span className="name">{info?.name ?? 'Exercice supprimé'}</span>
                      <span className="target">
                        {entry.sets} × {entry.reps}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setEditingEntry({ dayId: day.id, entry })}
                      aria-label="Modifier"
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removePlanExercise(plan.id, day.id, entry.id)}
                      aria-label="Retirer"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )
              })
            )}

            <button type="button" className="day-add" onClick={() => setPickerDayId(day.id)}>
              <IconPlus size={16} />
              Ajouter un exercice
            </button>
          </div>
        ))}

        <button type="button" className="btn secondary" onClick={() => setAddingDay(true)}>
          <IconPlus size={18} />
          Ajouter un jour
        </button>

        <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
          Supprimer ce programme
        </button>
      </div>

      {renaming ? (
        <TextPromptSheet
          title="Renommer le programme"
          label="Nom du programme"
          initial={plan.name}
          onConfirm={(name) => renamePlan(plan.id, name)}
          onClose={() => setRenaming(false)}
        />
      ) : null}

      {addingDay ? (
        <TextPromptSheet
          title="Nouveau jour"
          label="Nom du jour"
          confirmLabel="Ajouter"
          onConfirm={(name) => addDay(plan.id, name)}
          onClose={() => setAddingDay(false)}
        />
      ) : null}

      {renamingDay ? (
        <TextPromptSheet
          title="Renommer le jour"
          label="Nom du jour"
          initial={renamingDay.name}
          onConfirm={(name) => renameDay(plan.id, renamingDay.id, name)}
          onClose={() => setRenamingDay(null)}
        />
      ) : null}

      {pickerDayId ? (
        <ExercisePicker
          title="Ajouter un exercice"
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
          exercise={exerciseById(editingEntry.entry.exerciseId) ?? { id: '', name: 'Exercice', muscle: 'chest' }}
          initial={editingEntry.entry}
          onConfirm={(target) => updatePlanExercise(plan.id, editingEntry.dayId, editingEntry.entry.id, target)}
          onClose={() => setEditingEntry(null)}
        />
      ) : null}

      {confirmDelete ? (
        <Sheet title="Supprimer ce programme ?" subtitle={plan.name} onClose={() => setConfirmDelete(false)}>
          <div className="stack">
            <p className="hint">Les jours et objectifs de ce programme seront définitivement supprimés. Les séances déjà enregistrées sont conservées.</p>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                removePlan(plan.id)
                setConfirmDelete(false)
                onBack()
              }}
            >
              Supprimer
            </button>
          </div>
        </Sheet>
      ) : null}
    </FormPage>
  )
}

export function PlanificationScreen() {
  const { plans, activePlanId, addPlan } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const selected = plans.find((p) => p.id === selectedId)
  if (selected) return <PlanDetail plan={selected} onBack={() => setSelectedId(null)} />

  return (
    <div className="screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Programmes</h2>
        <p className="hint" style={{ marginTop: 4 }}>
          Construisez vos jours d'entraînement : exercices, séries et répétitions visées.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="card">
          <p className="empty">Aucun programme pour le moment.</p>
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
                {activePlanId === plan.id ? <span className="active-badge">Actif</span> : null}
              </div>
              <span className="days-sub">
                {plan.days.length === 0
                  ? 'Aucun jour configuré'
                  : plan.days.map((day) => day.name).join(' · ')}
              </span>
            </button>
          ))}
        </div>
      )}

      <button type="button" className="btn" onClick={() => setCreating(true)}>
        <IconPlus size={18} />
        Nouveau programme
      </button>

      {creating ? (
        <TextPromptSheet
          title="Nouveau programme"
          label="Nom du programme"
          confirmLabel="Créer"
          onConfirm={(name) => setSelectedId(addPlan(name).id)}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </div>
  )
}
