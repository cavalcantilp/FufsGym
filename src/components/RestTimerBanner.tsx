import { useApp } from '../state/AppContext'
import { IconClose, IconTimer } from './icons'
import { formatRestDigits } from './RestTimer'

interface RestTimerBannerProps {
  remainingMs: number
  progress: number
  label?: string
  onExpand: () => void
  onSkip: () => void
}

/** Bandeau réduit du minuteur de repos, posé au-dessus de la barre d'onglets : le décompte continue même en changeant d'onglet. */
export function RestTimerBanner({ remainingMs, progress, label, onExpand, onSkip }: RestTimerBannerProps) {
  const { t } = useApp()
  const displayLabel = label ?? t('train.restTimerLabel')

  return (
    <div className="rest-timer-banner">
      <button type="button" className="rest-timer-banner-main" onClick={onExpand} aria-label={t('train.restExpandAria')}>
        <IconTimer size={18} />
        <span className="rest-timer-banner-label">{displayLabel}</span>
        <span className="rest-timer-banner-digits">{formatRestDigits(remainingMs)}</span>
      </button>
      <button
        type="button"
        className="rest-timer-banner-skip"
        onClick={(event) => {
          event.stopPropagation()
          onSkip()
        }}
        aria-label={t('train.restSkip')}
      >
        <IconClose size={16} />
      </button>
      <div className="rest-timer-banner-bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}
