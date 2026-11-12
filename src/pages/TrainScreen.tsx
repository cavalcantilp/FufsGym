import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseCard } from '../components/ExerciseCard'
import { MuscleDiagram } from '../components/MuscleDiagram'
import { Sheet } from '../components/Sheet'
import { SortableList } from '../components/SortableList'
import { exerciseName } from '../lib/exercises'
import { SpotifyMiniPlayer } from '../components/SpotifyMiniPlayer'
import { IconCheck, IconChevronDown, IconDumbbell, IconFlame, IconPlus, IconTimer } from '../components/icons'
import { fromKey, localeOf, shiftDay, todayKey, formatDay } from '../lib/date'
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

/** Durée écoulée depuis le début de la séance, rafraîchie chaque seconde. */
function ElapsedTime({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])
  const total = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return (
    <span className="tabular">
      {h ? `${h}:${String(m).padStart(2, '0')}` : m}:{String(s).padStart(2, '0')}
    </span>
  )
}

function StartView({ onStart }: StartViewProps) {
  const { t, lang, workouts, schedules, sessions } = useApp()
  const today = todayKey()
  const [otherPickerOpen, setOtherPickerOpen] = useState(false)

  const streak = useMemo(() => plannedStreak(sessions, schedules, today), [sessions, schedules, today])
  const week = useMemo(() => {
    const monday = shiftDay(today, -((fromKey(today).getDay() + 6) % 7))
    const trained = new Set(sessions.filter((s) => s.finishedAt).map((s) => s.date))
    return Array.from({ length: 7 }, (_, index) => {
      const key = shiftDay(monday, index)
      const date = fromKey(key)
      return {
        key,
        label: date.toLocaleDateString(localeOf(lang), { weekday: 'narrow' }),
        day: date.getDate(),
        trained: trained.has(key),
        planned: schedulesForDate(schedules, key).length > 0,
      }
    })
  }, [today, sessions, schedules, lang])
  const weekDone = week.filter((d) => d.trained).length
  const weekPlanned = week.filter((d) => d.planned || d.trained).length

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
        <span className="eyebrow">{formatDay(today, lang)}</span>
        <h2 className="screen-title">{t('train.title')}</h2>
      </div>

      {options.length ? (
        options.map(({ schedule, workout }) => (
          <div className="card" key={schedule.id}>
            <span className="eyebrow accent">{t('train.plannedToday')}</span>
            <div className="plan-card-head" style={{ marginTop: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="letter-badge" style={{ background: LETTER_COLOR[schedule.letter] }}>
                  {schedule.letter}
                </span>
                <span className="name big">{workout.name}</span>
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

      <div className="card week-strip">
        {week.map((d) => (
          <div key={d.key}>
            <span>{d.label}</span>
            <b className={d.trained ? 'did' : d.key === today ? 'today' : d.planned ? 'planned' : ''}>{d.day}</b>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card mini-stat">
          <span className="eyebrow">{t('train.streakTitle')}</span>
          <div className="value">
            {streak} <small>{t('calendar.streak')}</small>
          </div>
        </div>
        <div className="card mini-stat">
          <span className="eyebrow">{t('train.thisWeek')}</span>
          <div className="value">
            {weekDone}
            <small>/{Math.max(weekPlanned, weekDone)}</small>
          </div>
        </div>
      </div>

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
    reorderSessionExercises,
    finishSession,
    deleteSession,
    renameSession,
    addWorkout,
    addExercise,
    replaceWorkoutExercises,
    startRestTimer,
  } = useApp()
  const [picking, setPicking] = useState(false)
  const [reordering, setReordering] = useState(false)
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
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0)
  const firstPendingId = session.exercises.find((e) => e.sets.some((set) => !set.done))?.id
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
      <div className="form-page-head">
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
          <span className="sub">
            {t('train.inProgress')} · <ElapsedTime since={session.startedAt} /> · {formatDay(session.date, lang)}
          </span>
        </div>
      </div>

      <div className="session-progress">
        <div className="progress-track">
          <i style={{ width: `${totalSets ? (setCount / totalSets) * 100 : 0}%` }} />
        </div>
        <span>
          {setCount}/{totalSets}
        </span>
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

      {groupBySuperset(session.exercises).map((group) => {
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
                onReorder={() => setReordering(true)}
                defaultExpanded={sessionExercise.id === firstPendingId}
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
            onReorder={() => setReordering(true)}
            defaultExpanded={group[0].id === firstPendingId}
          />
        )
      })}

      {reordering ? (
        <Sheet title={t('reorder.title')} subtitle={t('reorder.hint')} onClose={() => setReordering(false)}>
          <SortableList
            className="reorder-list"
            handleLabel={t('reorder.handle')}
            onReorder={(from, to) => reorderSessionExercises(session.id, from, to)}
            items={groupBySuperset(session.exercises).map((group) => ({
              id: group[0].id,
              content: (
                <div className="reorder-row">
                  {group.map((entry) => {
                    const info = exerciseById(entry.exerciseId)
                    return (
                      <span className="name" key={entry.id}>
                        {info ? exerciseName(info, t) : t('exercise.unknown')}
                      </span>
                    )
                  })}
                  <span className="sub">
                    {group.length > 1 ? `${t('train.supersetLabel', { count: group.length })} · ` : ''}
                    {group.reduce((sum, entry) => sum + entry.sets.filter((set) => set.done).length, 0)}/
                    {group.reduce((sum, entry) => sum + entry.sets.length, 0)} {t('reorder.setsDone')}
                  </span>
                </div>
              ),
            }))}
          />
          <button type="button" className="btn" style={{ marginTop: 14 }} onClick={() => setReordering(false)}>
            {t('reorder.done')}
          </button>
        </Sheet>
      ) : null}

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
