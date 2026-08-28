import { useApp } from '../state/AppContext'
import { IconMinus, IconPlus } from './icons'
import { REST_STEP_SEC } from '../lib/rest'

interface RestTimerProps {
  remainingMs: number
  progress: number
  onAdjust: (deltaMs: number) => void
  onMinimize: () => void
  onSkip: () => void
  /** Libellé affiché au-dessus du cadran : "Repos" par défaut, personnalisable pour un minuteur autonome. */
  label?: string
  /** Libellé du bouton de fermeture du bas : "Passer le repos" par défaut. */
  skipLabel?: string
}

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Deux bips francs, générés à la volée : aucun asset audio à charger, fonctionne
 * hors-ligne. Chaque bip superpose la fondamentale et une octave au-dessus (plus
 * de présence qu'une simple sinusoïde) et passe par un compresseur pour pousser
 * le volume perçu sans écrêter.
 */
export function playChime() {
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

export function formatRestDigits(remainingMs: number): string {
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(remainingSeconds / 60)
  const secs = remainingSeconds % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

/**
 * Minuteur de repos plein écran, déclenché quand une série est cochée. La
 * circonférence se remplit au fil du temps (0 au départ, complète à
 * l'échéance) plutôt que de se vider, pour un repère visuel de progression.
 * Purement présentationnel : le décompte lui-même vit dans RestTimerHost,
 * monté au niveau de l'appli, pour survivre à un changement d'onglet — la
 * croix ne ferme donc pas le minuteur mais le réduit en bandeau.
 */
export function RestTimer({ remainingMs, progress, onAdjust, onMinimize, onSkip, label, skipLabel }: RestTimerProps) {
  const { t } = useApp()
  const digits = formatRestDigits(remainingMs)
  const displayLabel = label ?? t('train.restTimerLabel')

  return (
    <div className="rest-timer-overlay" role="dialog" aria-modal="true" aria-label={displayLabel}>
      <button type="button" className="rest-timer-close" onClick={onMinimize} aria-label={t('train.restMinimizeAria')}>
        <IconMinus size={22} />
      </button>

      <div className="rest-timer-label">{displayLabel}</div>

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

      <div className="rest-timer-adjust">
        <button
          type="button"
          className="btn secondary rest-timer-add"
          onClick={() => onAdjust(-REST_STEP_SEC * 1000)}
        >
          <IconMinus size={18} />
          {t('train.restSubtract15')}
        </button>
        <button type="button" className="btn secondary rest-timer-add" onClick={() => onAdjust(REST_STEP_SEC * 1000)}>
          <IconPlus size={18} />
          {t('train.restAdd15')}
        </button>
      </div>

      <button type="button" className="rest-timer-skip" onClick={onSkip}>
        {skipLabel ?? t('train.restSkip')}
      </button>
    </div>
  )
}
