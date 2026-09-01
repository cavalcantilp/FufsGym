import { useId, useMemo } from 'react'
import { useApp } from '../state/AppContext'
import type { HeartRateSample } from '../lib/types'

interface HeartRateChartProps {
  samples: HeartRateSample[]
  /** Départ de la séance (ISO), pour situer chaque relevé en minutes écoulées. */
  startedAt: string
}

const WIDTH = 320
const HEIGHT = 110
const PAD = { top: 12, right: 8, bottom: 18, left: 8 }

/** Courbe simple de la fréquence cardiaque au fil d'une séance (minutes écoulées en abscisse). */
export function HeartRateChart({ samples, startedAt }: HeartRateChartProps) {
  const { t } = useApp()
  const gradientId = useId()

  const model = useMemo(() => {
    if (samples.length < 2) return null
    const startMs = new Date(startedAt).getTime()
    const values = samples.map((s) => s.bpm)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const margin = Math.max((max - min) * 0.15, 3)
    const low = Math.max(0, Math.floor(min - margin))
    const high = Math.ceil(max + margin)
    const spanRange = high - low || 1
    const durationMs = Math.max(samples[samples.length - 1].t - startMs, 1)

    const innerW = WIDTH - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom

    const points = samples.map((sample) => ({
      sample,
      x: PAD.left + ((sample.t - startMs) / durationMs) * innerW,
      y: PAD.top + (1 - (sample.bpm - low) / spanRange) * innerH,
    }))

    const avg = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
    return { points, min, max, avg }
  }, [samples, startedAt])

  if (!model) return null

  const path = model.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
  const areaPath = `${path} L${model.points[model.points.length - 1].x} ${HEIGHT - PAD.bottom} L${model.points[0].x} ${HEIGHT - PAD.bottom} Z`

  return (
    <div className="heart-rate-chart">
      <div className="stat-row">
        <div className="stat">
          <div className="label">{t('train.heartRateAvg')}</div>
          <div className="value">{model.avg}</div>
        </div>
        <div className="stat">
          <div className="label">{t('train.heartRateMax')}</div>
          <div className="value accent">{model.max}</div>
        </div>
        <div className="stat">
          <div className="label">{t('train.heartRateMin')}</div>
          <div className="value">{model.min}</div>
        </div>
      </div>
      <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${model.min}-${model.max} bpm`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--negative)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--negative)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke="var(--negative)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
