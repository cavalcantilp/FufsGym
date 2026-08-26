import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { NumberField } from './NumberField'
import { HoldTimer } from './HoldTimer'
import { ExerciseInfoButton } from './ExerciseInfoButton'
import { MuscleDiagram } from './MuscleDiagram'
import { IconArrowDown, IconArrowUp, IconCheck, IconChevronDown, IconPlay, IconPlus, IconTrash } from './icons'
import { exerciseName, isDurationBased } from '../lib/exercises'
import { EXERCISE_ACTIVATION } from '../lib/exerciseActivation'
import { ACTIVATION_STOPS, NEUTRAL_MUSCLE_COLOR, interpolateColor } from '../lib/colorScale'
import { DEFAULT_REST_SEC, MIN_REST_SEC, REST_STEP_SEC, formatRestTime } from '../lib/rest'
import { displayWeightValue, fromDisplayWeight } from '../lib/weightUnit'
import type { Session, SessionExercise } from '../lib/types'

interface ExerciseCardProps {
  session: Session
  sessionExercise: SessionExercise
  /** Omis pour une séance déjà terminée (correction d'historique) : cocher une série ne lance alors aucun minuteur. */
  onSetCompleted?: (restSec: number) => void
  /** Faux pour un exercice qui n'est pas le dernier d'un superset : cocher une série y enchaîne directement, sans minuteur. */
  triggersRest?: boolean
  /** Faux pendant une séance active (S'entraîner) : le schéma musculaire n'y est affiché qu'en correction d'historique. */
  showMuscleDiagram?: boolean
  /** Vrai pendant une séance active : affiche des flèches pour réordonner les exercices. */
  showReorder?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
}

/** Carte repliable d'un exercice en séance : nom + résumé, détail (dernière fois, repos, séries) sur demande. */
export function ExerciseCard({
  session,
  sessionExercise,
  onSetCompleted,
  triggersRest = false,
  showMuscleDiagram = true,
  showReorder = false,
  canMoveUp = false,
  canMoveDown = false,
}: ExerciseCardProps) {
  const {
    t,
    units,
    exerciseById,
    lastPerformance,
    addSet,
    updateSet,
    removeSet,
    removeSessionExercise,
    moveSessionExercise,
    updateSessionExerciseRest,
    updateSessionExerciseCardioUnit,
  } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [timingSetId, setTimingSetId] = useState<string | null>(null)
  const info = exerciseById(sessionExercise.exerciseId)
  const isCardio = info?.muscle === 'cardio'
  const isHold = Boolean(info && isDurationBased(info) && !isCardio)
  const cardioUnit = sessionExercise.cardioUnit ?? 'min'
  const last = useMemo(
    () => lastPerformance(sessionExercise.exerciseId, session.date),
    [lastPerformance, sessionExercise.exerciseId, session.date],
  )
  const restSec = sessionExercise.restSec ?? DEFAULT_REST_SEC
  const doneCount = sessionExercise.sets.filter((set) => set.done).length
  const allSetsDone = sessionExercise.sets.length > 0 && doneCount === sessionExercise.sets.length
  const activation = EXERCISE_ACTIVATION[sessionExercise.exerciseId]
  const colorForMuscle = (muscleId: string) => {
    const intensity = activation?.[muscleId] ?? 0
    return intensity > 0 ? interpolateColor(ACTIVATION_STOPS, intensity) : NEUTRAL_MUSCLE_COLOR
  }

  const formatSet = (set: (typeof sessionExercise.sets)[number]) => {
    if (isHold) return formatRestTime(set.durationSec ?? 0)
    if (!isCardio) return `${displayWeightValue(set.weight, units.weight)}${units.weight}×${set.reps}`
    const parts: string[] = []
    if (set.durationMin) parts.push(`${set.durationMin} min`)
    if (set.distanceKm) parts.push(`${set.distanceKm} km`)
    return parts.join(' · ') || '—'
  }

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
          {allSetsDone ? (
            <span className="exercise-complete-badge" aria-label={t('train.exerciseComplete')}>
              <IconCheck size={13} />
            </span>
          ) : null}
          <IconChevronDown open={expanded} size={16} />
        </button>
        {info ? <ExerciseInfoButton exercise={info} /> : null}
        {showReorder ? (
          <span className="reorder-btns">
            <button
              type="button"
              className="icon-btn"
              disabled={!canMoveUp}
              onClick={() => moveSessionExercise(session.id, sessionExercise.id, 'up')}
              aria-label={t('day.moveUpAria')}
            >
              <IconArrowUp size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={!canMoveDown}
              onClick={() => moveSessionExercise(session.id, sessionExercise.id, 'down')}
              aria-label={t('day.moveDownAria')}
            >
              <IconArrowDown size={14} />
            </button>
          </span>
        ) : null}
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
            {last ? t('train.lastTime', { sets: last.map(formatSet).join(', ') }) : t('train.firstTime')}
          </p>

          {activation && showMuscleDiagram ? (
            <div className="info-section" style={{ padding: '10px 16px 0' }}>
              <MuscleDiagram colorFor={colorForMuscle} />
              <div className="legend">
                <span className="legend-label">{t('exerciseInfo.legendLow')}</span>
                <span className="legend-bar" />
                <span className="legend-label">{t('exerciseInfo.legendHigh')}</span>
              </div>
            </div>
          ) : null}

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

          {isCardio ? (
            <div className="segmented" style={{ margin: '0 16px 10px' }}>
              <button
                type="button"
                className={cardioUnit === 'min' ? 'active' : ''}
                onClick={() => updateSessionExerciseCardioUnit(session.id, sessionExercise.id, 'min')}
              >
                {t('train.cardioUnitMin')}
              </button>
              <button
                type="button"
                className={cardioUnit === 'km' ? 'active' : ''}
                onClick={() => updateSessionExerciseCardioUnit(session.id, sessionExercise.id, 'km')}
              >
                {t('train.cardioUnitKm')}
              </button>
            </div>
          ) : null}

          <div className="set-rows">
            {sessionExercise.sets.map((set, index) => (
              <div
                className={`set-row${set.done ? ' done' : ''}${isHold ? ' hold' : ''}${isCardio ? ' cardio' : ''}`}
                key={set.id}
              >
                <span className="idx">{index + 1}</span>
                {isHold ? (
                  <>
                    <NumberField
                      id={`${set.id}-d`}
                      value={set.durationSec ?? 0}
                      onCommit={(durationSec) => updateSet(session.id, sessionExercise.id, set.id, { durationSec })}
                      placeholder="sec"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      className="icon-btn accent"
                      onClick={() => setTimingSetId(set.id)}
                      aria-label={t('train.holdStart')}
                    >
                      <IconPlay size={16} />
                    </button>
                  </>
                ) : isCardio ? (
                  cardioUnit === 'min' ? (
                    <NumberField
                      id={`${set.id}-d`}
                      value={set.durationMin ?? 0}
                      onCommit={(durationMin) => updateSet(session.id, sessionExercise.id, set.id, { durationMin })}
                      placeholder="min"
                      inputMode="decimal"
                    />
                  ) : (
                    <NumberField
                      id={`${set.id}-k`}
                      value={set.distanceKm ?? 0}
                      onCommit={(distanceKm) => updateSet(session.id, sessionExercise.id, set.id, { distanceKm })}
                      placeholder="km"
                      inputMode="decimal"
                    />
                  )
                ) : (
                  <>
                    <NumberField
                      id={`${set.id}-w`}
                      value={displayWeightValue(set.weight, units.weight)}
                      onCommit={(value) =>
                        updateSet(session.id, sessionExercise.id, set.id, {
                          weight: fromDisplayWeight(value, units.weight),
                        })
                      }
                      placeholder={units.weight}
                      inputMode="decimal"
                    />
                    <NumberField
                      id={`${set.id}-r`}
                      value={set.reps}
                      onCommit={(reps) => updateSet(session.id, sessionExercise.id, set.id, { reps })}
                      placeholder="reps"
                      inputMode="numeric"
                    />
                  </>
                )}
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

      {timingSetId ? (
        <HoldTimer
          onCommit={(seconds) => {
            updateSet(session.id, sessionExercise.id, timingSetId, { durationSec: seconds, done: true })
            if (triggersRest) onSetCompleted?.(restSec)
            setTimingSetId(null)
          }}
          onClose={() => setTimingSetId(null)}
        />
      ) : null}
    </div>
  )
}
