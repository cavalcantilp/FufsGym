import { useApp } from '../state/AppContext'
import { formatRestDigits } from './RestTimer'

interface RestTimerBannerProps {
  remainingMs: number
  progress: number
  label?: string
  onExpand: () => void
  onAdd: () => void
  onSkip: () => void
}

/** Bandeau réduit du minuteur de repos, flottant au-dessus de la barre d'onglets : le décompte continue même en changeant d'onglet. */
export function RestTimerBanner({ remainingMs, progress, label, onExpand, onAdd, onSkip }: RestTimerBannerProps) {
  const { t } = useApp()
  const displayLabel = label ?? t('train.restTimerLabel')

  return (
    <div className="rest-timer-banner">
      <button type="button" className="rest-timer-banner-main" onClick={onExpand} aria-label={t('train.restExpandAria')}>
        <span className="rest-timer-banner-label">{displayLabel}</span>
        <span className="rest-timer-banner-digits">{formatRestDigits(remainingMs)}</span>
      </button>
      <button type="button" className="rest-timer-banner-pill" onClick={onAdd}>
        +15 s
      </button>
      <button type="button" className="rest-timer-banner-pill" onClick={onSkip} aria-label={t('train.restSkip')}>
        {t('train.restSkipShort')}
      </button>
      <div className="rest-timer-banner-bar" style={{ transform: `scaleX(${1 - progress})` }} />
    </div>
  )
}
