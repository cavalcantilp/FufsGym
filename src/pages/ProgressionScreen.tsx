import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { LineChart, type RangeKey } from '../components/LineChart'
import { RangePicker } from '../components/RangePicker'
import { FormPage } from '../components/FormPage'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseCard } from '../components/ExerciseCard'
import { MuscleMapScreen } from './MuscleMapScreen'
import { MUSCLE_COLOR, exerciseName } from '../lib/exercises'
import { formatLong, formatShort, todayKey } from '../lib/date'
import { groupBySuperset } from '../lib/superset'
import { buildPlanExercises, nextAvailableName } from '../lib/saveWorkout'
import { IconCheck, IconChevronRight, IconDumbbell, IconFlame, IconHeart, IconPlus } from '../components/icons'
import {
  bestEstimate1RM,
  bestWeight,
  longestTrainingStreak,
  oneRepMaxSeries,
  sessionSetCount,
  sessionTypes,
  sessionVolume,
  trainedExerciseIds,
  trainingStreak,
  volumeSeries,
} from '../lib/stats'
import { displayWeightValue } from '../lib/weightUnit'
import type { Session, Workout } from '../lib/types'

function HistoryScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (sessionId: string) => void }) {
  const { t, lang, units, sessions, exerciseById } = useApp()

  const finished = useMemo(
    () =>
      sessions
        .filter((s) => s.finishedAt)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '')),
    [sessions],
  )

  return (
    <FormPage title={t('history.title')} onBack={onBack}>
      <div className="stack">
        {finished.length === 0 ? (
          <div className="card">
            <p className="empty">{t('history.empty')}</p>
          </div>
        ) : (
          finished.map((session) => {
            const volume = displayWeightValue(sessionVolume(session), units.weight)
            const setCount = sessionSetCount(session)
            const types = sessionTypes(session, exerciseById)
            return (
              <button type="button" className="plan-card" key={session.id} onClick={() => onSelect(session.id)}>
                <div className="plan-card-head">
                  <span className="name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {types.length ? (
                      <span className="session-type-icons">
                        {types.map((type) => (
                          <span key={type} className={`day-type-icon ${type}`}>
                            {type === 'strength' ? <IconDumbbell size={14} /> : <IconHeart size={14} />}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {session.workoutName ?? t('train.freeSession')}
                  </span>
                  <span className="value accent" style={{ fontSize: '0.9rem' }}>
                    {volume} {units.weight}
                  </span>
                </div>
                <span className="days-sub">
                  {formatLong(session.date, lang)} · {setCount} {t('unit.set')}
                </span>
              </button>
            )
          })
        )}
      </div>
    </FormPage>
  )
}

function SessionEditScreen({ session, onBack }: { session: Session; onBack: () => void }) {
  const {
    t,
    lang,
    units,
    workouts,
    exerciseById,
    addSessionExercise,
    deleteSession,
    renameSession,
    addWorkout,
    addExercise,
    replaceWorkoutExercises,
  } = useApp()
  const [picking, setPicking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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

  const trimmedDraft = nameDraft.trim()
  const nameDirty = trimmedDraft !== '' && trimmedDraft !== currentName

  const saveName = () => {
    if (!trimmedDraft) return
    renameSession(session.id, trimmedDraft)
  }

  const nameField = (
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
  )

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
    <FormPage title={nameField} backLabel={currentName} subtitle={formatLong(session.date, lang)} onBack={onBack}>
      <div className="stack">
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

        {groupBySuperset(session.exercises).map((group) =>
          group.length > 1 ? (
            <div className="superset-block" key={group[0].id}>
              <div className="superset-block-label">{t('train.supersetLabel', { count: group.length })}</div>
              {group.map((sessionExercise) => (
                <ExerciseCard key={sessionExercise.id} session={session} sessionExercise={sessionExercise} />
              ))}
            </div>
          ) : (
            <ExerciseCard key={group[0].id} session={session} sessionExercise={group[0]} />
          ),
        )}

        <button type="button" className="btn secondary" onClick={() => setPicking(true)}>
          <IconPlus size={18} />
          {t('train.addExercise')}
        </button>

        <button type="button" className="btn secondary" onClick={openSaveSheet}>
          <IconCheck size={18} />
          {t('train.saveAsWorkout')}
        </button>

        <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
          {t('history.deleteSession')}
        </button>
      </div>

      {confirmDelete ? (
        <Sheet title={t('history.deleteConfirmTitle')} onClose={() => setConfirmDelete(false)}>
          <div className="stack">
            <p className="hint">{t('history.deleteConfirmBody')}</p>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                deleteSession(session.id)
                setConfirmDelete(false)
                onBack()
              }}
            >
              {t('history.deleteSession')}
            </button>
          </div>
        </Sheet>
      ) : null}

      {saveSheetOpen ? (
        <Sheet title={t('train.saveWorkoutTitle')} onClose={() => setSaveSheetOpen(false)}>
          <div className="stack">
            <div className="field">
              <label htmlFor="history-save-workout-name">{t('workout.newName')}</label>
              <input
                id="history-save-workout-name"
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
    </FormPage>
  )
}

export function ProgressionScreen() {
  const { t, lang, units, sessions, exerciseById } = useApp()
  const [range, setRange] = useState<RangeKey>('3m')
  const [screen, setScreen] = useState<'main' | 'history' | 'muscles'>('main')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const trainedIds = useMemo(() => trainedExerciseIds(sessions), [sessions])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activeExerciseId = selectedId ?? trainedIds[0] ?? null
  const activeExercise = activeExerciseId ? exerciseById(activeExerciseId) : undefined

  const streak = useMemo(() => trainingStreak(sessions, todayKey()), [sessions])
  const bestStreak = useMemo(() => longestTrainingStreak(sessions), [sessions])

  const volumePoints = useMemo(
    () => volumeSeries(sessions).map((point) => ({ ...point, value: displayWeightValue(point.value, units.weight) })),
    [sessions, units.weight],
  )
  const oneRmPoints = useMemo(
    () =>
      (activeExerciseId ? oneRepMaxSeries(sessions, activeExerciseId) : []).map((point) => ({
        ...point,
        value: displayWeightValue(point.value, units.weight),
      })),
    [sessions, activeExerciseId, units.weight],
  )
  const best1RM = activeExerciseId ? bestEstimate1RM(sessions, activeExerciseId) : null
  const bestW = activeExerciseId ? bestWeight(sessions, activeExerciseId) : null

  const records = useMemo(() => {
    return trainedIds
      .map((id) => {
        const info = exerciseById(id)
        const best = bestEstimate1RM(sessions, id)
        if (!info || !best) return null
        return { info, best }
      })
      .filter((row): row is { info: NonNullable<ReturnType<typeof exerciseById>>; best: { date: string; value: number } } => row !== null)
      .sort((a, b) => b.best.value - a.best.value)
  }, [trainedIds, sessions, exerciseById])

  const editingSession = editingSessionId ? sessions.find((s) => s.id === editingSessionId) : undefined
  if (editingSession) {
    return <SessionEditScreen session={editingSession} onBack={() => setEditingSessionId(null)} />
  }

  if (screen === 'history') {
    return (
      <HistoryScreen
        onBack={() => setScreen('main')}
        onSelect={(sessionId) => setEditingSessionId(sessionId)}
      />
    )
  }

  if (screen === 'muscles') {
    return <MuscleMapScreen onBack={() => setScreen('main')} />
  }

  return (
    <div className="screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('progress.title')}</h2>
        <p className="hint" style={{ marginTop: 4 }}>{t('progress.subtitle')}</p>
      </div>

      <button type="button" className="plan-card" onClick={() => setScreen('history')}>
        <div className="plan-card-head">
          <span className="name">{t('history.title')}</span>
          <IconChevronRight size={18} />
        </div>
        <span className="days-sub">{t('history.subtitle')}</span>
      </button>

      <button type="button" className="plan-card" onClick={() => setScreen('muscles')}>
        <div className="plan-card-head">
          <span className="name">{t('muscleMap.title')}</span>
          <IconChevronRight size={18} />
        </div>
        <span className="days-sub">{t('muscleMap.subtitle')}</span>
      </button>

      <div className="card">
        <div className="card-title">{t('progress.streakTitle')}</div>
        <div className="stat-row">
          <div className="stat">
            <div className="label">{t('progress.streakCurrent')}</div>
            <div className="value accent" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconFlame size={16} />
              {streak} {t('unit.day')}
            </div>
          </div>
          <div className="stat">
            <div className="label">{t('progress.streakBest')}</div>
            <div className="value">
              {bestStreak} {t('unit.day')}
            </div>
          </div>
        </div>
      </div>

      <RangePicker range={range} onChange={setRange} />

      <div className="card">
        <div className="card-title">{t('progress.volumeTitle')}</div>
        {volumePoints.length ? (
          <LineChart points={volumePoints} unit={units.weight} color="var(--accent)" range={range} aggregate="sum" />
        ) : (
          <p className="hint">{t('progress.volumeEmpty')}</p>
        )}
      </div>

      {trainedIds.length ? (
        <div className="card">
          <div className="card-title">{t('progress.oneRmTitle')}</div>
          <select value={activeExerciseId ?? ''} onChange={(event) => setSelectedId(event.target.value)}>
            {trainedIds.map((id) => {
              const info = exerciseById(id)
              return (
                <option key={id} value={id}>
                  {info ? exerciseName(info, t) : id}
                </option>
              )
            })}
          </select>

          {activeExercise ? (
            <div className="muscle-tag" style={{ marginTop: 10 }}>
              <span className="dot" style={{ background: MUSCLE_COLOR[activeExercise.muscle] }} />
              {exerciseName(activeExercise, t)}
            </div>
          ) : null}

          <div className="stat-row" style={{ marginTop: 14 }}>
            <div className="stat">
              <div className="label">{t('progress.oneRmEstimate')}</div>
              <div className="value accent">
                {best1RM ? `${displayWeightValue(best1RM.value, units.weight)} ${units.weight}` : '—'}
              </div>
            </div>
            <div className="stat">
              <div className="label">{t('progress.maxWeight')}</div>
              <div className="value">
                {bestW ? `${displayWeightValue(bestW.value, units.weight)} ${units.weight}` : '—'}
              </div>
            </div>
            <div className="stat">
              <div className="label">{t('progress.recordDate')}</div>
              <div className="value" style={{ fontSize: '0.85rem' }}>{best1RM ? formatShort(best1RM.date, lang) : '—'}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {oneRmPoints.length ? (
              <LineChart points={oneRmPoints} unit={units.weight} color="var(--accent)" range={range} />
            ) : (
              <p className="hint">{t('progress.oneRmEmpty')}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="empty">{t('progress.emptyAll')}</p>
        </div>
      )}

      {records.length ? (
        <div>
          <div className="card-title">{t('progress.records')}</div>
          <div className="pr-list">
            {records.map(({ info, best }) => (
              <div className="pr-row" key={info.id}>
                <span className="muscle-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: MUSCLE_COLOR[info.muscle] }} />
                <span className="info">
                  <span className="name">{exerciseName(info, t)}</span>
                  <span className="date">{formatShort(best.date, lang)}</span>
                </span>
                <span className="value">
                  {displayWeightValue(best.value, units.weight)} {units.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
