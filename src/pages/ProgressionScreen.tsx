import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { LineChart, RANGE_LABEL, RANGE_ORDER, type RangeKey } from '../components/LineChart'
import { MUSCLE_COLOR, exerciseName } from '../lib/exercises'
import { formatShort } from '../lib/date'
import {
  bestEstimate1RM,
  bestWeight,
  oneRepMaxSeries,
  round1,
  trainedExerciseIds,
  volumeSeries,
} from '../lib/stats'

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

export function ProgressionScreen() {
  const { t, lang, sessions, exerciseById } = useApp()
  const [range, setRange] = useState<RangeKey>('3m')
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

  return (
    <div className="screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('progress.title')}</h2>
        <p className="hint" style={{ marginTop: 4 }}>{t('progress.subtitle')}</p>
      </div>

      <RangePicker range={range} onChange={setRange} />

      <div className="card">
        <div className="card-title">{t('progress.volumeTitle')}</div>
        {volumePoints.length ? (
          <LineChart points={volumePoints} unit="kg" color="var(--accent)" range={range} />
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
