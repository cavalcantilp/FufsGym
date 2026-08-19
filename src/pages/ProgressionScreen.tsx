import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { LineChart, RANGE_LABEL, RANGE_ORDER, type RangeKey } from '../components/LineChart'
import { FormPage } from '../components/FormPage'
import { Sheet } from '../components/Sheet'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseCard } from '../components/ExerciseCard'
import { MUSCLE_COLOR, exerciseName } from '../lib/exercises'
import { formatLong, formatShort } from '../lib/date'
import { groupBySuperset } from '../lib/superset'
import { IconCheck, IconChevronRight, IconDumbbell, IconHeart, IconPlus } from '../components/icons'
import {
  bestEstimate1RM,
  bestWeight,
  oneRepMaxSeries,
  round1,
  sessionSetCount,
  sessionTypes,
  sessionVolume,
  trainedExerciseIds,
  volumeSeries,
} from '../lib/stats'
import type { Session } from '../lib/types'

function RangePicker({ range, onChange }: { range: RangeKey; onChange: (range: RangeKey) => void }) {
  const { t } = useApp()
  return (
    <div className="chart-ranges">
      {RANGE_ORDER.map((key) => (
        <button
          key={key}
          type="button"
          className={`chart-range${range === key ? ' active' : ''}`}
          onClick={() => onChange(key)}
        >
          {t(RANGE_LABEL[key])}
        </button>
      ))}
    </div>
  )
}

function HistoryScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (sessionId: string) => void }) {
  const { t, lang, sessions, exerciseById } = useApp()

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
            const volume = round1(sessionVolume(session))
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
                    {volume} kg
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
  const { t, lang, addSessionExercise, deleteSession, renameSession } = useApp()
  const [picking, setPicking] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const currentName = session.workoutName ?? t('train.freeSession')
  const [nameDraft, setNameDraft] = useState(currentName)

  const volume = round1(sessionVolume(session))
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
              <div className="value accent">{volume} kg</div>
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

        <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
          {t('history.deleteSession')}
        </button>
      </div>

      {picking ? (
        <ExercisePicker
          title={t('picker.addTitle')}
          onClose={() => setPicking(false)}
          onPick={(exercise) => {
            addSessionExercise(session.id, exercise.id)
            setPicking(false)
          }}
        />
      ) : null}

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
    </FormPage>
  )
}

export function ProgressionScreen() {
  const { t, lang, sessions, exerciseById } = useApp()
  const [range, setRange] = useState<RangeKey>('3m')
  const [screen, setScreen] = useState<'main' | 'history'>('main')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const trainedIds = useMemo(() => trainedExerciseIds(sessions), [sessions])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const activeExerciseId = selectedId ?? trainedIds[0] ?? null
  const activeExercise = activeExerciseId ? exerciseById(activeExerciseId) : undefined

  const volumePoints = useMemo(() => volumeSeries(sessions), [sessions])
  const oneRmPoints = useMemo(
    () => (activeExerciseId ? oneRepMaxSeries(sessions, activeExerciseId) : []),
    [sessions, activeExerciseId],
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

      <RangePicker range={range} onChange={setRange} />

      <div className="card">
        <div className="card-title">{t('progress.volumeTitle')}</div>
        {volumePoints.length ? (
          <LineChart points={volumePoints} unit="kg" color="var(--accent)" range={range} aggregate="sum" />
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
              <div className="value accent">{best1RM ? `${best1RM.value} kg` : '—'}</div>
            </div>
            <div className="stat">
              <div className="label">{t('progress.maxWeight')}</div>
              <div className="value">{bestW ? `${round1(bestW.value)} kg` : '—'}</div>
            </div>
            <div className="stat">
              <div className="label">{t('progress.recordDate')}</div>
              <div className="value" style={{ fontSize: '0.85rem' }}>{best1RM ? formatShort(best1RM.date, lang) : '—'}</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {oneRmPoints.length ? (
              <LineChart points={oneRmPoints} unit="kg" color="var(--accent)" range={range} />
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
                <span className="value">{best.value} kg</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
