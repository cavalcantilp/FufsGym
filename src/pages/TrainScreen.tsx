import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { ExercisePicker } from '../components/ExercisePicker'
import { NumberField } from '../components/NumberField'
import { IconCheck, IconDumbbell, IconPlus, IconTrash } from '../components/icons'
import { todayKey, formatDay } from '../lib/date'
import { round1, sessionSetCount, sessionVolume } from '../lib/stats'
import type { Session, SessionExercise } from '../lib/types'

interface StartViewProps {
  onStart: (day?: { planId: string; day: import('../lib/types').PlanDay } | null) => void
}

function StartView({ onStart }: StartViewProps) {
  const { plans, activePlanId, nextDayFor } = useApp()
  const activePlan = plans.find((p) => p.id === activePlanId)
  const suggested = activePlan ? nextDayFor(activePlan.id) : null
  const [pickingDay, setPickingDay] = useState(false)

  return (
    <div className="screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>S'entraîner</h2>
        <p className="hint" style={{ marginTop: 4 }}>{formatDay(todayKey())}</p>
      </div>

      {activePlan && suggested ? (
        <div className="card">
          <div className="card-title">Prochaine séance suggérée</div>
          <div className="plan-card-head">
            <span className="name">{suggested.name}</span>
          </div>
          <p className="hint" style={{ marginTop: 4, marginBottom: 14 }}>
            {suggested.exercises.length} exercice{suggested.exercises.length > 1 ? 's' : ''} · {activePlan.name}
          </p>
          <button type="button" className="btn" onClick={() => onStart({ planId: activePlan.id, day: suggested })}>
            <IconDumbbell size={18} />
            Commencer cette séance
          </button>
          {activePlan.days.length > 1 ? (
            <button type="button" className="btn secondary" style={{ marginTop: 10 }} onClick={() => setPickingDay(true)}>
              Choisir un autre jour
            </button>
          ) : null}
        </div>
      ) : (
        <div className="card">
          <p className="empty">
            {activePlan ? 'Ce programme n\'a pas encore de jour configuré.' : 'Aucun programme actif. Créez-en un dans Planification, ou lancez une séance libre.'}
          </p>
        </div>
      )}

      <button type="button" className="btn secondary" onClick={() => onStart(null)}>
        <IconPlus size={18} />
        Séance libre
      </button>

      {pickingDay && activePlan ? (
        <div className="sheet-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setPickingDay(false)}>
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-head">
              <h2>Choisir un jour</h2>
            </div>
            <div className="stack">
              {activePlan.days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  className="plan-card"
                  onClick={() => {
                    setPickingDay(false)
                    onStart({ planId: activePlan.id, day })
                  }}
                >
                  <div className="plan-card-head">
                    <span className="name">{day.name}</span>
                  </div>
                  <span className="days-sub">{day.exercises.length} exercice{day.exercises.length > 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ExerciseCard({ session, sessionExercise }: { session: Session; sessionExercise: SessionExercise }) {
  const { exerciseById, lastPerformance, addSet, updateSet, removeSet, removeSessionExercise } = useApp()
  const info = exerciseById(sessionExercise.exerciseId)
  const last = useMemo(
    () => lastPerformance(sessionExercise.exerciseId, session.date),
    [lastPerformance, sessionExercise.exerciseId, session.date],
  )

  return (
    <div className="session-exercise">
      <div className="session-exercise-head">
        <span className="info">
          <span className="name">{info?.name ?? 'Exercice'}</span>
          {last ? (
            <span className="last">Dernière fois : {last.map((set) => `${set.weight}kg×${set.reps}`).join(', ')}</span>
          ) : (
            <span className="last">Première fois sur cet exercice</span>
          )}
        </span>
        <button
          type="button"
          className="icon-btn danger"
          onClick={() => removeSessionExercise(session.id, sessionExercise.id)}
          aria-label="Retirer cet exercice"
        >
          <IconTrash size={16} />
        </button>
      </div>

      <div className="set-rows">
        {sessionExercise.sets.map((set, index) => (
          <div className={`set-row${set.done ? ' done' : ''}`} key={set.id}>
            <span className="idx">{index + 1}</span>
            <NumberField
              id={`${set.id}-w`}
              value={set.weight}
              onCommit={(weight) => updateSet(session.id, sessionExercise.id, set.id, { weight })}
              placeholder="kg"
              inputMode="decimal"
            />
            <NumberField
              id={`${set.id}-r`}
              value={set.reps}
              onCommit={(reps) => updateSet(session.id, sessionExercise.id, set.id, { reps })}
              placeholder="reps"
              inputMode="numeric"
            />
            <button
              type="button"
              className="done-toggle"
              onClick={() => updateSet(session.id, sessionExercise.id, set.id, { done: !set.done })}
              aria-label={set.done ? 'Série validée' : 'Valider la série'}
            >
              <IconCheck size={16} />
            </button>
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => removeSet(session.id, sessionExercise.id, set.id)}
              aria-label="Supprimer cette série"
            >
              <IconTrash size={15} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="set-add" onClick={() => addSet(session.id, sessionExercise.id)}>
        <IconPlus size={15} />
        Ajouter une série
      </button>
    </div>
  )
}

function ActiveSessionView({ session }: { session: Session }) {
  const { addSessionExercise, finishSession, deleteSession } = useApp()
  const [picking, setPicking] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)

  const volume = round1(sessionVolume(session))
  const setCount = sessionSetCount(session)

  return (
    <div className="screen">
      <div className="form-page-head" style={{ alignItems: 'center' }}>
        <div>
          <h2>{session.dayName ?? 'Séance libre'}</h2>
          <span className="sub">{formatDay(session.date)}</span>
        </div>
      </div>

      <div className="card">
        <div className="stat-row">
          <div className="stat">
            <div className="label">Exercices</div>
            <div className="value">{session.exercises.length}</div>
          </div>
          <div className="stat">
            <div className="label">Séries faites</div>
            <div className="value">{setCount}</div>
          </div>
          <div className="stat">
            <div className="label">Volume</div>
            <div className="value accent">{volume} kg</div>
          </div>
        </div>
      </div>

      {session.exercises.map((sessionExercise) => (
        <ExerciseCard key={sessionExercise.id} session={session} sessionExercise={sessionExercise} />
      ))}

      <button type="button" className="btn secondary" onClick={() => setPicking(true)}>
        <IconPlus size={18} />
        Ajouter un exercice
      </button>

      <div className="grid-2">
        <button type="button" className="btn danger" onClick={() => setConfirmEnd(true)}>
          Annuler la séance
        </button>
        <button type="button" className="btn" onClick={() => finishSession(session.id)}>
          Terminer la séance
        </button>
      </div>

      {picking ? (
        <ExercisePicker
          title="Ajouter un exercice"
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            addSessionExercise(session.id, exercise.id)
            setPicking(false)
          }}
        />
      ) : null}

      {confirmEnd ? (
        <div className="sheet-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setConfirmEnd(false)}>
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-head">
              <h2>Annuler cette séance ?</h2>
            </div>
            <div className="stack">
              <p className="hint">Les séries déjà saisies seront perdues.</p>
              <button type="button" className="btn danger" onClick={() => deleteSession(session.id)}>
                Annuler la séance
              </button>
              <button type="button" className="btn secondary" onClick={() => setConfirmEnd(false)}>
                Continuer la séance
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function TrainScreen() {
  const { sessionsFor, startSession } = useApp()
  const today = todayKey()
  const current = sessionsFor(today).find((s) => !s.finishedAt)

  if (current) return <ActiveSessionView session={current} />

  return (
    <StartView
      onStart={(day) => {
        startSession(today, day ?? null)
      }}
    />
  )
}
