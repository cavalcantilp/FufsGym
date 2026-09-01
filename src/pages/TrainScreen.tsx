import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseCard } from '../components/ExerciseCard'
import { HeartRateChart } from '../components/HeartRateChart'
import { HeartRateMonitor } from '../components/HeartRateMonitor'
import { MuscleDiagram } from '../components/MuscleDiagram'
import { Sheet } from '../components/Sheet'
import { SpotifyMiniPlayer } from '../components/SpotifyMiniPlayer'
import { IconCheck, IconChevronDown, IconDumbbell, IconFlame, IconPlus, IconTimer } from '../components/icons'
import { todayKey, formatDay } from '../lib/date'
import { LETTER_COLOR, schedulesForDate } from '../lib/schedule'
import { groupBySuperset } from '../lib/superset'
import { buildPlanExercises, nextAvailableName } from '../lib/saveWorkout'
import { plannedStreak, sessionSetCount, sessionVolume } from '../lib/stats'
import { displayWeightValue } from '../lib/weightUnit'
import { aggregateActivation } from '../lib/exerciseActivation'
import { ACTIVATION_STOPS, NEUTRAL_MUSCLE_COLOR, interpolateColor } from '../lib/colorScale'
import type { Session, Workout } from '../lib/types'

interface StartViewProps {
  onStart: (workout?: Workout | null) => void
}

function StartView({ onStart }: StartViewProps) {
  const { t, lang, workouts, schedules } = useApp()
  const today = todayKey()
  const [otherPickerOpen, setOtherPickerOpen] = useState(false)

  const options = useMemo(() => {
    return schedulesForDate(schedules, today)
      .map((schedule) => {
        const workout = workouts.find((w) => w.id === schedule.workoutId)
        return workout ? { schedule, workout } : null
      })
      .filter((entry): entry is { schedule: (typeof schedules)[number]; workout: Workout } => entry !== null)
  }, [schedules, workouts, today])

  const otherWorkouts = useMemo(() => {
    const todayIds = new Set(options.map((entry) => entry.workout.id))
    return workouts.filter((w) => !todayIds.has(w.id))
  }, [workouts, options])

  const scheduleForWorkoutId = (workoutId: string) => schedules.find((s) => s.workoutId === workoutId)

  return (
    <div className="screen train-screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('train.title')}</h2>
        <p className="hint" style={{ marginTop: 4 }}>{formatDay(today, lang)}</p>
      </div>

      {options.length ? (
        options.map(({ schedule, workout }) => (
          <div className="card" key={schedule.id}>
            <div className="plan-card-head">
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="letter-badge" style={{ background: LETTER_COLOR[schedule.letter] }}>
                  {schedule.letter}
                </span>
                <span className="name">{workout.name}</span>
              </span>
            </div>
            <p className="hint" style={{ marginTop: 4, marginBottom: 14 }}>
              {workout.exercises.length} {t('unit.exercise')}
            </p>
            <button type="button" className="btn" onClick={() => onStart(workout)}>
              <IconDumbbell size={18} />
              {t('train.startSuggested')}
            </button>
          </div>
        ))
      ) : (
        <div className="card">
          <p className="empty">{t('train.noneToday')}</p>
        </div>
      )}

      {otherWorkouts.length ? (
        <button type="button" className="btn secondary" onClick={() => setOtherPickerOpen(true)}>
          <IconDumbbell size={18} />
          {t('train.chooseWorkoutPlaceholder')}
        </button>
      ) : null}

      <button type="button" className="btn secondary" onClick={() => onStart(null)}>
        <IconPlus size={18} />
        {t('train.freeSession')}
      </button>

      {otherPickerOpen ? (
        <Sheet title={t('train.chooseWorkoutPlaceholder')} onClose={() => setOtherPickerOpen(false)} centered>
          <div className="stack">
            {otherWorkouts.map((workout) => {
              const schedule = scheduleForWorkoutId(workout.id)
              return (
                <button
                  key={workout.id}
                  type="button"
                  className="plan-card"
                  onClick={() => {
                    setOtherPickerOpen(false)
                    onStart(workout)
                  }}
                >
                  <div className="plan-card-head">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {schedule ? (
                        <span className="letter-badge" style={{ background: LETTER_COLOR[schedule.letter] }}>
                          {schedule.letter}
                        </span>
                      ) : null}
                      <span className="name">{workout.name}</span>
                    </span>
                  </div>
                  <span className="days-sub">
                    {workout.exercises.length} {t('unit.exercise')}
                  </span>
                </button>
              )
            })}
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}

function SessionSummaryView({ session, onClose }: { session: Session; onClose: () => void }) {
  const { t, lang, units, sessions, schedules, dayNotes, setDayNote } = useApp()
  const volume = displayWeightValue(sessionVolume(session), units.weight)
  const setCount = sessionSetCount(session)
  const streak = useMemo(() => plannedStreak(sessions, schedules, session.date), [sessions, schedules, session.date])

  // La séance active était potentiellement scrollée (longue liste d'exercices) :
  // sans ceci, cet écran s'affiche à la même position au lieu de repartir du haut.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const savedNote = dayNotes[session.date] ?? ''
  const [noteDraft, setNoteDraft] = useState(savedNote)
  const noteDirty = noteDraft.trim() !== savedNote
  const [musclesOpen, setMusclesOpen] = useState(false)

  const activation = useMemo(
    () => aggregateActivation(session.exercises.map((entry) => entry.exerciseId)),
    [session.exercises],
  )
  const colorForMuscle = (muscleId: string) => {
    const intensity = activation[muscleId] ?? 0
    return intensity > 0 ? interpolateColor(ACTIVATION_STOPS, intensity) : NEUTRAL_MUSCLE_COLOR
  }

  return (
    <div className="screen summary-screen train-screen">
      <div className="summary-badge">
        <IconCheck size={44} />
      </div>
      <h2>{t('train.summaryTitle')}</h2>
      <p className="congrats">{t('train.summaryCongrats')}</p>
      <span className="sub">{session.workoutName ?? t('train.freeSession')} · {formatDay(session.date, lang)}</span>

      {streak > 0 ? (
        <span className="streak" style={{ marginTop: 10 }} aria-label={`${streak} ${t('calendar.streak')}`}>
          <IconFlame size={14} />
          <strong>{streak}</strong>
          <span className="streak-label">{t('calendar.streak')}</span>
        </span>
      ) : null}

      <div className="card" style={{ width: '100%', marginTop: 14 }}>
        <div className="stat-row">
          <div className="stat">
            <div className="label">{t('train.exercises')}</div>
            <div className="value">{session.exercises.length}</div>
          </div>
          <div className="stat">
            <div className="label">{t('train.setsDone')}</div>
            <div className="value">{setCount}</div>
          </div>
          <div className="stat">
            <div className="label">{t('train.volume')}</div>
            <div className="value accent">
              {volume} {units.weight}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ width: '100%', marginTop: 14 }}>
        <div className="field">
          <label htmlFor="summary-note">{t('day.session.noteLabel')}</label>
          <textarea
            id="summary-note"
            rows={3}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder={t('day.session.notePlaceholder')}
          />
        </div>
        {noteDirty ? (
          <button
            type="button"
            className="btn"
            style={{ marginTop: 10 }}
            onClick={() => setDayNote(session.date, noteDraft.trim())}
          >
            <IconCheck size={16} />
            {t('day.session.noteSave')}
          </button>
        ) : null}
      </div>

      <div className="card" style={{ width: '100%', marginTop: 14 }}>
        <button type="button" className="disclosure-head" onClick={() => setMusclesOpen((current) => !current)}>
          {t('exerciseInfo.muscleTitle')}
          <IconChevronDown open={musclesOpen} size={16} />
        </button>
        {musclesOpen ? (
          <div className="disclosure-body">
            <MuscleDiagram colorFor={colorForMuscle} />
            <div className="legend">
              <span className="legend-label">{t('exerciseInfo.legendLow')}</span>
              <span className="legend-bar" />
              <span className="legend-label">{t('exerciseInfo.legendHigh')}</span>
            </div>
          </div>
        ) : null}
      </div>

      {session.heartRateSamples && session.heartRateSamples.length > 1 ? (
        <div className="card" style={{ width: '100%', marginTop: 14 }}>
          <div className="card-title">{t('settings.heartRateTitle')}</div>
          <HeartRateChart samples={session.heartRateSamples} startedAt={session.startedAt} />
        </div>
      ) : null}

      <button type="button" className="btn" style={{ marginTop: 14 }} onClick={onClose}>
        {t('train.summaryClose')}
      </button>
    </div>
  )
}

function ActiveSessionView({
  session,
  onFinish,
}: {
  session: Session
  onFinish: (sessionId: string) => void
}) {
  const {
    t,
    lang,
    units,
    workouts,
    exerciseById,
    addSessionExercise,
    finishSession,
    deleteSession,
    renameSession,
    addWorkout,
    addExercise,
    replaceWorkoutExercises,
    startRestTimer,
    addHeartRateSample,
  } = useApp()
  const [picking, setPicking] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const isFreeSession = !session.workoutId
  const currentName = session.workoutName ?? t('train.freeSession')
  const [nameDraft, setNameDraft] = useState(currentName)

  const [saveSheetOpen, setSaveSheetOpen] = useState(false)
  const [saveNameDraft, setSaveNameDraft] = useState('')
  const [conflict, setConflict] = useState<{ name: string; workout: Workout } | null>(null)
  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    if (!savedToast) return
    const timeout = setTimeout(() => setSavedToast(false), 1800)
    return () => clearTimeout(timeout)
  }, [savedToast])

  const openSaveSheet = () => {
    setSaveNameDraft(session.workoutName ?? '')
    setSaveSheetOpen(true)
  }

  const performSave = (name: string, overwriteId?: string) => {
    const planExercises = buildPlanExercises(session, workouts, exerciseById, t)
    if (overwriteId) {
      replaceWorkoutExercises(overwriteId, planExercises)
    } else {
      const created = addWorkout(name)
      planExercises.forEach((entry) => addExercise(created.id, entry))
    }
    setSaveSheetOpen(false)
    setConflict(null)
    setSavedToast(true)
  }

  const handleSaveSubmit = () => {
    const trimmed = saveNameDraft.trim()
    if (!trimmed) return
    const match = workouts.find((w) => w.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (match) {
      setConflict({ name: trimmed, workout: match })
    } else {
      performSave(trimmed)
    }
  }

  const volume = displayWeightValue(sessionVolume(session), units.weight)
  const setCount = sessionSetCount(session)
  const allSessionSetsDone =
    session.exercises.length > 0 &&
    session.exercises.every((exercise) => exercise.sets.length > 0 && exercise.sets.every((set) => set.done))

  const trimmedDraft = nameDraft.trim()
  const nameDirty = trimmedDraft !== '' && trimmedDraft !== currentName

  const saveName = () => {
    if (!trimmedDraft) return
    renameSession(session.id, trimmedDraft)
  }

  const handleSetCompleted = (restSec: number) => {
    startRestTimer(restSec)
  }

  if (picking) {
    return (
      <ExercisePicker
        title={t('picker.addTitle')}
        onClose={() => setPicking(false)}
        onPick={(exercise) => {
          addSessionExercise(session.id, exercise.id)
          setPicking(false)
        }}
      />
    )
  }

  return (
    <div className="screen train-screen">
      <div className="form-page-head" style={{ alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isFreeSession ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                className="plan-name-input"
                value={nameDraft}
                aria-label={t('history.sessionNameLabel')}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={() => {
                  if (!nameDraft.trim()) setNameDraft(currentName)
                }}
              />
              {nameDirty ? (
                <button type="button" className="name-save-btn" onClick={saveName} aria-label={t('history.saveName')}>
                  <IconCheck size={16} />
                </button>
              ) : null}
            </span>
          ) : (
            <h2>{session.workoutName ?? t('train.freeSession')}</h2>
          )}
          <span className="sub">{formatDay(session.date, lang)}</span>
        </div>
        <HeartRateMonitor onSample={(bpm) => addHeartRateSample(session.id, bpm)} />
      </div>

      <div className="card">
        <div className="stat-row">
          <div className="stat">
            <div className="label">{t('train.exercises')}</div>
            <div className="value">{session.exercises.length}</div>
          </div>
          <div className="stat">
            <div className="label">{t('train.setsDone')}</div>
            <div className="value">{setCount}</div>
          </div>
          <div className="stat">
            <div className="label">{t('train.volume')}</div>
            <div className="value accent">
              {volume} {units.weight}
            </div>
          </div>
        </div>
      </div>

      <SpotifyMiniPlayer />

      {groupBySuperset(session.exercises).map((group, groupIndex, groups) => {
        const canMoveUp = groupIndex > 0
        const canMoveDown = groupIndex < groups.length - 1
        return group.length > 1 ? (
          <div className="superset-block" key={group[0].id}>
            <div className="superset-block-label">{t('train.supersetLabel', { count: group.length })}</div>
            {group.map((sessionExercise, index) => (
              <ExerciseCard
                key={sessionExercise.id}
                session={session}
                sessionExercise={sessionExercise}
                onSetCompleted={handleSetCompleted}
                triggersRest={index === group.length - 1}
                showMuscleDiagram={false}
                showReorder
                canMoveUp={canMoveUp}
                canMoveDown={canMoveDown}
              />
            ))}
          </div>
        ) : (
          <ExerciseCard
            key={group[0].id}
            session={session}
            sessionExercise={group[0]}
            onSetCompleted={handleSetCompleted}
            triggersRest
            showMuscleDiagram={false}
            showReorder
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
          />
        )
      })}

      <button type="button" className="btn secondary" onClick={() => setPicking(true)}>
        <IconPlus size={18} />
        {t('train.addExercise')}
      </button>

      <button type="button" className="btn secondary" onClick={openSaveSheet}>
        <IconCheck size={18} />
        {t('train.saveAsWorkout')}
      </button>

      <div className="grid-2">
        <button type="button" className="btn danger" onClick={() => setConfirmEnd(true)}>
          {t('train.cancelSession')}
        </button>
        <button
          type="button"
          className={allSessionSetsDone ? 'btn success' : 'btn'}
          onClick={() => {
            finishSession(session.id)
            onFinish(session.id)
          }}
        >
          {t('train.finishSession')}
        </button>
      </div>

      {confirmEnd ? (
        <div className="sheet-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setConfirmEnd(false)}>
          <div className="sheet" role="dialog" aria-modal="true">
            <div className="sheet-head">
              <h2>{t('train.cancelConfirmTitle')}</h2>
            </div>
            <div className="stack">
              <p className="hint">{t('train.cancelConfirmBody')}</p>
              <button type="button" className="btn danger" onClick={() => deleteSession(session.id)}>
                {t('train.cancelSession')}
              </button>
              <button type="button" className="btn secondary" onClick={() => setConfirmEnd(false)}>
                {t('train.continueSession')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveSheetOpen ? (
        <Sheet title={t('train.saveWorkoutTitle')} onClose={() => setSaveSheetOpen(false)}>
          <div className="stack">
            <div className="field">
              <label htmlFor="save-workout-name">{t('workout.newName')}</label>
              <input
                id="save-workout-name"
                type="text"
                value={saveNameDraft}
                onChange={(event) => setSaveNameDraft(event.target.value)}
                placeholder={t('workout.newName')}
              />
            </div>
            <button type="button" className="btn" onClick={handleSaveSubmit}>
              {t('train.saveWorkoutConfirm')}
            </button>
          </div>
        </Sheet>
      ) : null}

      {conflict ? (
        <Sheet title={t('train.saveWorkoutConflictTitle')} onClose={() => setConflict(null)}>
          <div className="stack">
            <p className="hint">{t('train.saveWorkoutConflictBody', { name: conflict.name })}</p>
            <button
              type="button"
              className="btn danger"
              onClick={() => performSave(conflict.name, conflict.workout.id)}
            >
              {t('train.saveWorkoutOverwrite')}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => performSave(nextAvailableName(conflict.name, workouts))}
            >
              {t('train.saveWorkoutKeepBoth')}
            </button>
          </div>
        </Sheet>
      ) : null}

      {savedToast ? <div className="toast">{t('train.saveWorkoutSuccess')}</div> : null}
    </div>
  )
}

export function TrainScreen() {
  const { t, sessions, sessionsFor, startSession, activeRestTimer, startRestTimer } = useApp()
  const today = todayKey()
  const [justFinishedId, setJustFinishedId] = useState<string | null>(null)

  const justFinished = justFinishedId ? sessions.find((s) => s.id === justFinishedId) : undefined
  const current = sessionsFor(today).find((s) => !s.finishedAt)

  let body: React.ReactNode
  if (justFinished) {
    body = <SessionSummaryView session={justFinished} onClose={() => setJustFinishedId(null)} />
  } else if (current) {
    body = <ActiveSessionView session={current} onFinish={setJustFinishedId} />
  } else {
    body = (
      <StartView
        onStart={(workout) => {
          startSession(today, workout ?? null)
        }}
      />
    )
  }

  return (
    <>
      {body}

      {activeRestTimer ? null : (
        <button
          type="button"
          className="quick-timer-fab"
          onClick={() => startRestTimer(60, { label: t('train.quickTimerLabel'), skipLabel: t('train.quickTimerSkip') })}
          aria-label={t('train.quickTimerAria')}
        >
          <IconTimer size={26} />
        </button>
      )}
    </>
  )
}
