import { useId, useMemo, useState } from 'react'
import { daysBetween, formatDay, formatShort, shiftDay, todayKey } from '../lib/date'
import { round1 } from '../lib/stats'

interface LineChartPoint {
  date: string
  value: number
}

interface LineChartProps {
  /** Tous les points connus, triés par date croissante — le filtrage par période se fait ici. */
  points: LineChartPoint[]
  unit: string
  color: string
  range: RangeKey
  /** Sens souhaitable de la variation : une hausse de charge est positive, contrairement à un poids. */
  positiveDirection?: 'up' | 'down'
}

export type RangeKey = '1m' | '3m' | '6m' | '1a' | 'all'

const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = { '1m': 30, '3m': 90, '6m': 182, '1a': 365 }
export const RANGE_ORDER: RangeKey[] = ['1m', '3m', '6m', '1a', 'all']
export const RANGE_LABEL: Record<RangeKey, string> = {
  '1m': '1 M',
  '3m': '3 M',
  '6m': '6 M',
  '1a': '1 A',
  all: 'Tout',
}

const WIDTH = 320
const HEIGHT = 180
const PAD = { top: 14, right: 34, bottom: 20, left: 8 }

/** Courbe valeur/temps — 1RM estimé, volume — avec un en-tête façon suivi boursier. */
export function LineChart({ points: allPoints, unit, color, range, positiveDirection = 'up' }: LineChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const gradientId = useId()

  const entries = useMemo(() => {
    if (range === 'all') return allPoints
    const cutoff = shiftDay(todayKey(), -RANGE_DAYS[range])
    return allPoints.filter((point) => point.date >= cutoff)
  }, [allPoints, range])

  const last = allPoints.length ? allPoints[allPoints.length - 1] : null
  const first = entries.length ? entries[0] : null
  const delta = last && first && entries.length > 1 ? round1(last.value - first.value) : null
  const goodDelta = delta !== null && (positiveDirection === 'up' ? delta > 0 : delta < 0)
  const badDelta = delta !== null && delta !== 0 && !goodDelta
  const trendClass = delta === null || delta === 0 ? '' : goodDelta ? ' down' : badDelta ? ' up' : ''
  const trendArrow = delta === null || delta === 0 ? '' : delta > 0 ? '▲' : '▼'

  const model = useMemo(() => {
    if (entries.length < 2) return null

    const startDate = entries[0].date
    const span = Math.max(daysBetween(startDate, entries[entries.length - 1].date), 1)
    const values = entries.map((entry) => entry.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const margin = Math.max((max - min) * 0.15, 0.5)
    const low = Math.floor((min - margin) * 2) / 2
    const high = Math.ceil((max + margin) * 2) / 2
    const range2 = high - low || 1

    const innerW = WIDTH - PAD.left - PAD.right
    const innerH = HEIGHT - PAD.top - PAD.bottom

    const points = entries.map((entry) => ({
      entry,
      x: PAD.left + (daysBetween(startDate, entry.date) / span) * innerW,
      y: PAD.top + (1 - (entry.value - low) / range2) * innerH,
    }))

    return { points, low, high }
  }, [entries])

  if (!last) return null

  const path = model ? model.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ') : ''
  const areaPath = model
    ? `${path} L${model.points[model.points.length - 1].x} ${HEIGHT - PAD.bottom} L${model.points[0].x} ${HEIGHT - PAD.bottom} Z`
    : ''
  const lastPoint = model ? model.points[model.points.length - 1] : null
  const focused = model && active !== null ? model.points[active] : null
  const showMarkers = model ? model.points.length <= 14 : false

  const nearest = (clientX: number, target: SVGSVGElement) => {
    if (!model) return 0
    const box = target.getBoundingClientRect()
    const x = ((clientX - box.left) / box.width) * WIDTH
    let best = 0
    model.points.forEach((point, index) => {
      if (Math.abs(point.x - x) < Math.abs(model.points[best].x - x)) best = index
    })
    return best
  }

  return (
    <div className="line-chart">
      <div className="chart-head">
        <div className="chart-value">
          {last.value} {unit}
        </div>
        {delta !== null ? (
          <div className={`chart-delta${trendClass}`}>
            {delta > 0 ? '+' : ''}
            {delta} {unit} {trendArrow}
          </div>
        ) : null}
        <div className="chart-date">{formatDay(last.date)}</div>
      </div>

      {model && lastPoint ? (
        <svg
          className="chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${entries[0].value} ${unit} → ${entries[entries.length - 1].value} ${unit}`}
          onPointerMove={(event) => setActive(nearest(event.clientX, event.currentTarget))}
          onPointerLeave={() => setActive(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[model.high, model.low].map((value, index) => {
            const y = PAD.top + index * (HEIGHT - PAD.top - PAD.bottom)
            return (
              <g key={value}>
                <line
                  x1={PAD.left}
                  x2={WIDTH - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(148, 163, 184, 0.18)"
                  strokeWidth="1"
                />
                <text x={WIDTH - PAD.right + 5} y={y + 3} fill="var(--text-sub)" fontSize="9" fontWeight="600">
                  {value}
                </text>
              </g>
            )
          })}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {showMarkers
            ? model.points.map((point) => (
                <circle
                  key={point.entry.date}
                  cx={point.x}
                  cy={point.y}
                  r="3.5"
                  fill={color}
                  stroke="var(--card-bg)"
                  strokeWidth="2"
                />
              ))
            : null}

          <circle cx={lastPoint.x} cy={lastPoint.y} r="4.5" fill={color} stroke="var(--card-bg)" strokeWidth="2" />

          {focused && focused !== lastPoint ? (
            <>
              <line
                x1={focused.x}
                x2={focused.x}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="rgba(148, 163, 184, 0.35)"
                strokeWidth="1"
              />
              <circle cx={focused.x} cy={focused.y} r="4.5" fill={color} stroke="var(--card-bg)" strokeWidth="2" />
            </>
          ) : null}

          <text x={PAD.left} y={HEIGHT - 6} fill="var(--text-sub)" fontSize="9" fontWeight="600">
            {formatShort(entries[0].date)}
          </text>
          <text
            x={WIDTH - PAD.right}
            y={HEIGHT - 6}
            textAnchor="end"
            fill="var(--text-sub)"
            fontSize="9"
            fontWeight="600"
          >
            {formatShort((focused ?? lastPoint).entry.date)}
          </text>
        </svg>
      ) : (
        <p className="hint">Pas encore assez de données pour tracer une courbe.</p>
      )}
    </div>
  )
}
