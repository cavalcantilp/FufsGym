import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { IconClose, IconStop } from './icons'
import { useWakeLock } from '../hooks/useWakeLock'
import { formatRestTime } from '../lib/rest'

interface HoldTimerProps {
  onCommit: (seconds: number) => void
  onClose: () => void
}

/**
 * Chronomètre plein écran pour un maintien isométrique (planche…) : compte à
 * partir de 0, sans cible. « Arrêter » fige la durée dans la série ; la croix
 * ferme sans rien enregistrer.
 */
export function HoldTimer({ onCommit, onClose }: HoldTimerProps) {
  const { t } = useApp()
  useWakeLock()
  const [now, setNow] = useState(() => Date.now())
  const startedAt = useRef(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(interval)
  }, [])

  const elapsedSec = Math.floor((now - startedAt.current) / 1000)

  const stop = () => onCommit(elapsedSec)

  return (
    <div className="rest-timer-overlay" role="dialog" aria-modal="true" aria-label={t('train.holdTimerLabel')}>
      <button type="button" className="rest-timer-close" onClick={onClose} aria-label={t('train.holdCloseAria')}>
        <IconClose size={22} />
      </button>

      <div className="rest-timer-label">{t('train.holdTimerLabel')}</div>

      <div className="hold-timer-display">
        <span className="hold-timer-dot" />
        <div className="hold-timer-digits">{formatRestTime(elapsedSec)}</div>
      </div>

      <button type="button" className="btn hold-timer-stop" onClick={stop}>
        <IconStop size={18} />
        {t('train.holdStop')}
      </button>
    </div>
  )
}
