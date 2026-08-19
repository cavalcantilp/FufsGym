import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { IconClose, IconPlus } from './icons'
import { REST_STEP_SEC } from '../lib/rest'
import { useWakeLock } from '../hooks/useWakeLock'

interface RestTimerProps {
  seconds: number
  onClose: () => void
}

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Deux bips francs, générés à la volée : aucun asset audio à charger, fonctionne
 * hors-ligne. Chaque bip superpose la fondamentale et une octave au-dessus (plus
 * de présence qu'une simple sinusoïde) et passe par un compresseur pour pousser
 * le volume perçu sans écrêter.
 */
function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-12, ctx.currentTime)
    compressor.ratio.setValueAtTime(8, ctx.currentTime)
    compressor.connect(ctx.destination)

    const tone = (freq: number, start: number, duration: number, peak: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
      osc.connect(gain)
      gain.connect(compressor)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration + 0.05)
    }
    tone(880, 0, 0.22, 0.9)
    tone(1760, 0, 0.16, 0.35)
    tone(880, 0.26, 0.32, 0.9)
    tone(1760, 0.26, 0.22, 0.35)
    setTimeout(() => ctx.close().catch(() => {}), 1000)
  } catch {
    // Web Audio indisponible : le minuteur reste utilisable sans le son.
  }
  if (navigator.vibrate) navigator.vibrate([120, 60, 120])
}

/**
 * Minuteur de repos plein écran, déclenché quand une série est cochée. La
 * circonférence se remplit au fil du temps (0 au départ, complète à
 * l'échéance) plutôt que de se vider, pour un repère visuel de progression.
 */
export function RestTimer({ seconds, onClose }: RestTimerProps) {
  const { t } = useApp()
  useWakeLock()
  const [totalMs, setTotalMs] = useState(() => Math.max(1, seconds) * 1000)
  const [now, setNow] = useState(() => Date.now())
  const startedAt = useRef(Date.now())
  const firedRef = useRef(false)
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current)
    }
  }, [])

  const elapsedMs = now - startedAt.current
  const remainingMs = Math.max(0, totalMs - elapsedMs)
  const progress = Math.min(1, elapsedMs / totalMs)

  useEffect(() => {
    if (remainingMs > 0 || firedRef.current) return
    firedRef.current = true
    playChime()
    autoCloseRef.current = setTimeout(onClose, 1400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs === 0])

  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60
  const digits = `${minutes}:${String(secs).padStart(2, '0')}`

  return (
    <div className="rest-timer-overlay" role="dialog" aria-modal="true" aria-label={t('train.restTimerLabel')}>
      <button type="button" className="rest-timer-close" onClick={onClose} aria-label={t('train.restCloseAria')}>
        <IconClose size={22} />
      </button>

      <div className="rest-timer-label">{t('train.restTimerLabel')}</div>

      <div className="rest-timer-ring">
        <svg viewBox="0 0 200 200" className="rest-timer-svg">
          <circle cx="100" cy="100" r={RADIUS} className="rest-timer-track" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            className="rest-timer-progress"
            style={{
              strokeDasharray: CIRCUMFERENCE,
              strokeDashoffset: CIRCUMFERENCE * (1 - progress),
            }}
          />
        </svg>
        <div className="rest-timer-digits">{digits}</div>
      </div>

      <button
        type="button"
        className="btn secondary rest-timer-add"
        onClick={() => setTotalMs((t) => t + REST_STEP_SEC * 1000)}
      >
        <IconPlus size={18} />
        {t('train.restAdd15')}
      </button>

      <button type="button" className="rest-timer-skip" onClick={onClose}>
        {t('train.restSkip')}
      </button>
    </div>
  )
}
