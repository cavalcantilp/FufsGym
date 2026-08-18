import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { NumberField } from './NumberField'
import { IconCheck, IconChevronDown, IconPlus, IconTrash } from './icons'
import { exerciseName } from '../lib/exercises'
import { DEFAULT_REST_SEC, MIN_REST_SEC, REST_STEP_SEC, formatRestTime } from '../lib/rest'
import type { Session, SessionExercise } from '../lib/types'

interface ExerciseCardProps {
  session: Session
  sessionExercise: SessionExercise
  /** Omis pour une séance déjà terminée (correction d'historique) : cocher une série ne lance alors aucun minuteur. */
  onSetCompleted?: (restSec: number) => void
  /** Faux pour un exercice qui n'est pas le dernier d'un superset : cocher une série y enchaîne directement, sans minuteur. */
  triggersRest?: boolean
}

/** Carte repliable d'un exercice en séance : nom + résumé, détail (dernière fois, repos, séries) sur demande. */
export function ExerciseCard({ session, sessionExercise, onSetCompleted, triggersRest = false }: ExerciseCardProps) {
  const { t, exerciseById, lastPerformance, addSet, updateSet, removeSet, removeSessionExercise, updateSessionExerciseRest } =
    useApp()
  const [expanded, setExpanded] = useState(false)
  const info = exerciseById(sessionExercise.exerciseId)
  const last = useMemo(
    () => lastPerformance(sessionExercise.exerciseId, session.date),
    [lastPerformance, sessionExercise.exerciseId, session.date],
  )
  const restSec = sessionExercise.restSec ?? DEFAULT_REST_SEC
  const doneCount = sessionExercise.sets.filter((set) => set.done).length

  return (
    <div className={`session-exercise${expanded ? ' expanded' : ''}`}>
      <div className="session-exercise-head">
        <button type="button" className="disclosure-trigger" onClick={() => setExpanded((current) => !current)}>
          <span className="info">
            <span className="name">{info ? exerciseName(info, t) : ''}</span>
            <span className="last">
              {doneCount}/{sessionExercise.sets.length} {t('unit.set')} · {formatRestTime(restSec)}
            </span>
          </span>
          <IconChevronDown open={expanded} size={16} />
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={() => removeSessionExercise(session.id, sessionExercise.id)}
          aria-label={t('train.removeExerciseAria')}
        >
          <IconTrash size={16} />
        </button>
      </div>

      {expanded ? (
        <>
          <p className="hint" style={{ padding: '10px 16px 0' }}>
            {last
              ? t('train.lastTime', { sets: last.map((set) => `${set.weight}kg×${set.reps}`).join(', ') })
              : t('train.firstTime')}
          </p>

          <div className="rest-control">
            <span className="rest-control-label">{t('train.restBetweenSets')}</span>
            <div className="stepper">
              <button
                type="button"
                onClick={() =>
                  updateSessionExerciseRest(session.id, sessionExercise.id, Math.max(MIN_REST_SEC, restSec - REST_STEP_SEC))
                }
                aria-label={t('planEx.restDecrease')}
              >
                −
              </button>
              <span className="stepper-value">{formatRestTime(restSec)}</span>
              <button
                type="button"
                onClick={() => updateSessionExerciseRest(session.id, sessionExercise.id, restSec + REST_STEP_SEC)}
                aria-label={t('planEx.restIncrease')}
              >
                +
              </button>
            </div>
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
                  onClick={() => {
                    const next = !set.done
                    updateSet(session.id, sessionExercise.id, set.id, { done: next })
                    if (next && triggersRest) onSetCompleted?.(restSec)
                  }}
                  aria-label={set.done ? t('train.doneAria') : t('train.notDoneAria')}
                >
                  <IconCheck size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => removeSet(session.id, sessionExercise.id, set.id)}
                  aria-label={t('train.deleteSetAria')}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="set-add" onClick={() => addSet(session.id, sessionExercise.id)}>
            <IconPlus size={15} />
            {t('train.addSet')}
          </button>
        </>
      ) : null}
    </div>
  )
}
