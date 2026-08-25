import { useApp } from '../state/AppContext'
import { RANGE_LABEL, RANGE_ORDER, type RangeKey } from './LineChart'

/** Sélecteur de période partagé (1 semaine → tout), utilisé par les courbes de progression et la carte musculaire. */
export function RangePicker({ range, onChange }: { range: RangeKey; onChange: (range: RangeKey) => void }) {
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
