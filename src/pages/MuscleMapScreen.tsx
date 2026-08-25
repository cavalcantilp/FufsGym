import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { RangePicker } from '../components/RangePicker'
import { MuscleDiagram } from '../components/MuscleDiagram'
import { rangeStartDate, type RangeKey } from '../components/LineChart'
import { HEAT_STOPS, NEUTRAL_MUSCLE_COLOR, interpolateColor } from '../lib/colorScale'
import {
  ALL_BASE_MUSCLES,
  aggregateByBaseMuscle,
  computeMuscleLoad,
  exercisesForBaseMuscle,
  muscleBaseId,
} from '../lib/muscleLoad'
import { exerciseName } from '../lib/exercises'
import { todayKey } from '../lib/date'
import type { TranslationKey } from '../i18n/translations'

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

function muscleDisplayName(baseId: string, t: TFn): string {
  return t(`muscleName.${baseId}` as TranslationKey)
}

function MuscleDetailScreen({
  baseMuscleId,
  byMuscleByExercise,
  onBack,
}: {
  baseMuscleId: string
  byMuscleByExercise: Record<string, Record<string, number>>
  onBack: () => void
}) {
  const { t, exerciseById } = useApp()
  const rows = useMemo(
    () => exercisesForBaseMuscle(byMuscleByExercise, baseMuscleId),
    [byMuscleByExercise, baseMuscleId],
  )
  const max = rows[0]?.value ?? 0

  return (
    <FormPage title={muscleDisplayName(baseMuscleId, t)} subtitle={t('muscleMap.detailSubtitle')} onBack={onBack}>
      <div className="stack">
        {rows.length ? (
          <div className="muscle-rank-list">
            {rows.map(({ exerciseId, value }) => {
              const info = exerciseById(exerciseId)
              const pct = max > 0 ? Math.round((value / max) * 100) : 0
              return (
                <div className="muscle-rank-row" key={exerciseId}>
                  <span className="name">{info ? exerciseName(info, t) : exerciseId}</span>
                  <span className="muscle-rank-bar-track">
                    <span className="muscle-rank-bar-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </span>
                  <span className="pct">{pct}%</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="empty">{t('muscleMap.detailEmpty')}</p>
        )}
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

  const { byMuscle, byMuscleByExercise } = useMemo(() => {
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
        byMuscleByExercise={byMuscleByExercise}
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
