import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { RangePicker } from '../components/RangePicker'
import { MuscleDiagram } from '../components/MuscleDiagram'
import { ExerciseInfoButton } from '../components/ExerciseInfoButton'
import { rangeStartDate, type RangeKey } from '../components/LineChart'
import { HEAT_STOPS, NEUTRAL_MUSCLE_COLOR, interpolateColor } from '../lib/colorScale'
import {
  ALL_BASE_MUSCLES,
  aggregateByBaseMuscle,
  computeMuscleLoad,
  exercisesEngagingMuscle,
  muscleBaseId,
  performedExercisesForMuscle,
  type MuscleExercisePerformance,
} from '../lib/muscleLoad'
import { exerciseName } from '../lib/exercises'
import { round1 } from '../lib/stats'
import { todayKey } from '../lib/date'
import type { TranslationKey } from '../i18n/translations'
import type { Session } from '../lib/types'

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

function muscleDisplayName(baseId: string, t: TFn): string {
  return t(`muscleName.${baseId}` as TranslationKey)
}

type SortColumn = 'volume' | 'sessions' | 'maxLoad' | 'estRM' | 'engagement'
type SortDirection = 'asc' | 'desc'

const SORT_VALUE: Record<SortColumn, (row: MuscleExercisePerformance) => number> = {
  volume: (row) => row.volume,
  sessions: (row) => row.sessionsCount,
  maxLoad: (row) => row.maxLoad,
  estRM: (row) => row.estRM,
  engagement: (row) => row.engagementPct,
}

function SortableHeader({
  column,
  label,
  sort,
  onSort,
}: {
  column: SortColumn
  label: string
  sort: { column: SortColumn; direction: SortDirection }
  onSort: (column: SortColumn) => void
}) {
  const active = sort.column === column
  return (
    <th onClick={() => onSort(column)} className={active ? 'active' : undefined}>
      {label}
      {active ? <span className="sort-arrow">{sort.direction === 'desc' ? ' ▼' : ' ▲'}</span> : null}
    </th>
  )
}

function MuscleDetailScreen({
  baseMuscleId,
  sessions,
  range,
  onRangeChange,
  onBack,
}: {
  baseMuscleId: string
  sessions: Session[]
  range: RangeKey
  onRangeChange: (range: RangeKey) => void
  onBack: () => void
}) {
  const { t, exerciseById } = useApp()
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: 'volume',
    direction: 'desc',
  })

  const performed = useMemo(() => {
    const from = rangeStartDate(range)
    return performedExercisesForMuscle(sessions, baseMuscleId, from, todayKey())
  }, [sessions, baseMuscleId, range])

  const sortedPerformed = useMemo(() => {
    const getValue = SORT_VALUE[sort.column]
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...performed].sort((a, b) => (getValue(a) - getValue(b)) * factor)
  }, [performed, sort])

  const engaging = useMemo(() => exercisesEngagingMuscle(baseMuscleId), [baseMuscleId])

  const toggleSort = (column: SortColumn) => {
    setSort((current) =>
      current.column === column
        ? { column, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { column, direction: 'desc' },
    )
  }

  const colorFor = (muscleId: string) =>
    muscleBaseId(muscleId) === baseMuscleId ? 'var(--accent)' : NEUTRAL_MUSCLE_COLOR

  return (
    <FormPage title={muscleDisplayName(baseMuscleId, t)} subtitle={t('muscleMap.detailSubtitle')} onBack={onBack}>
      <div className="stack">
        <RangePicker range={range} onChange={onRangeChange} />

        <MuscleDiagram colorFor={colorFor} />

        <div className="info-section-title">{t('muscleMap.performedTitle')}</div>
        {sortedPerformed.length ? (
          <div className="muscle-table-wrap">
            <table className="muscle-table">
              <thead>
                <tr>
                  <th>{t('muscleMap.colExercise')}</th>
                  <SortableHeader column="volume" label={t('muscleMap.colVolume')} sort={sort} onSort={toggleSort} />
                  <SortableHeader column="sessions" label={t('muscleMap.colSessions')} sort={sort} onSort={toggleSort} />
                  <SortableHeader column="maxLoad" label={t('muscleMap.colMaxLoad')} sort={sort} onSort={toggleSort} />
                  <SortableHeader column="estRM" label={t('muscleMap.colEstRM')} sort={sort} onSort={toggleSort} />
                  <SortableHeader column="engagement" label={t('muscleMap.colEngagement')} sort={sort} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {sortedPerformed.map((row) => {
                  const info = exerciseById(row.exerciseId)
                  return (
                    <tr key={row.exerciseId}>
                      <td className="name-cell">{info ? exerciseName(info, t) : row.exerciseId}</td>
                      <td>{round1(row.volume)}</td>
                      <td>{row.sessionsCount}</td>
                      <td>{row.maxLoad ? round1(row.maxLoad) : '—'}</td>
                      <td>{row.estRM ? round1(row.estRM) : '—'}</td>
                      <td>{Math.round(row.engagementPct)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">{t('muscleMap.detailEmpty')}</p>
        )}

        <div className="info-section-title" style={{ marginTop: 4 }}>
          {t('muscleMap.engagedTitle')}
        </div>
        <div className="muscle-rank-list">
          {engaging.map((row) => {
            const info = exerciseById(row.exerciseId)
            const pct = Math.round(row.engagementPct)
            return (
              <div className="muscle-rank-row" key={row.exerciseId}>
                <span className="name">{info ? exerciseName(info, t) : row.exerciseId}</span>
                <span className="muscle-rank-bar-track">
                  <span className="muscle-rank-bar-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                </span>
                <span className="pct">{pct}%</span>
                {info ? <ExerciseInfoButton exercise={info} /> : null}
              </div>
            )
          })}
        </div>
      </div>
    </FormPage>
  )
}

/**
 * Carte musculaire : reprend le schéma anatomique de la fiche exercice pour visualiser,
 * en heat map (jaune → vert → bleu → violet), la charge d'entraînement cumulée par muscle
 * sur une période navigable — chaque exercice répartit son volume entre les muscles qu'il
 * sollicite au prorata de leur intensité (moteur principal vs secondaire).
 */
export function MuscleMapScreen({ onBack }: { onBack: () => void }) {
  const { t, sessions } = useApp()
  const [range, setRange] = useState<RangeKey>('3m')
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null)

  const { byMuscle } = useMemo(() => {
    const from = rangeStartDate(range)
    return computeMuscleLoad(sessions, from, todayKey())
  }, [sessions, range])

  const baseTotals = useMemo(() => aggregateByBaseMuscle(byMuscle), [byMuscle])

  const ranked = useMemo(
    () => ALL_BASE_MUSCLES.map((id) => ({ id, value: baseTotals[id] ?? 0 })).sort((a, b) => b.value - a.value),
    [baseTotals],
  )

  const maxLoad = ranked[0]?.value ?? 0
  const hasAnyData = maxLoad > 0

  const colorFor = (muscleId: string) => {
    const value = baseTotals[muscleBaseId(muscleId)] ?? 0
    return value > 0 ? interpolateColor(HEAT_STOPS, value / maxLoad) : NEUTRAL_MUSCLE_COLOR
  }

  if (selectedMuscle) {
    return (
      <MuscleDetailScreen
        baseMuscleId={selectedMuscle}
        sessions={sessions}
        range={range}
        onRangeChange={setRange}
        onBack={() => setSelectedMuscle(null)}
      />
    )
  }

  return (
    <FormPage title={t('muscleMap.title')} subtitle={t('muscleMap.subtitle')} onBack={onBack}>
      <div className="stack">
        <RangePicker range={range} onChange={setRange} />

        <div className="card">
          <div className="card-title">{t('muscleMap.diagramTitle')}</div>
          {hasAnyData ? (
            <>
              <MuscleDiagram colorFor={colorFor} onMuscleClick={(id) => setSelectedMuscle(muscleBaseId(id))} />
              <div className="legend">
                <span className="legend-label">{t('muscleMap.legendLow')}</span>
                <span className="legend-bar heat" />
                <span className="legend-label">{t('muscleMap.legendHigh')}</span>
              </div>
            </>
          ) : (
            <p className="hint">{t('muscleMap.empty')}</p>
          )}
        </div>

        {hasAnyData ? (
          <div>
            <div className="card-title">{t('muscleMap.rankTitle')}</div>
            <div className="muscle-rank-list">
              {ranked.map(({ id, value }) => {
                const pct = maxLoad > 0 ? Math.round((value / maxLoad) * 100) : 0
                return (
                  <button
                    type="button"
                    className={`muscle-rank-row${value <= 0 ? ' zero' : ''}`}
                    key={id}
                    onClick={() => setSelectedMuscle(id)}
                  >
                    <span className="name">{muscleDisplayName(id, t)}</span>
                    <span className="muscle-rank-bar-track">
                      <span
                        className="muscle-rank-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: value > 0 ? interpolateColor(HEAT_STOPS, value / maxLoad) : 'transparent',
                        }}
                      />
                    </span>
                    <span className="pct">{pct}%</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </FormPage>
  )
}
