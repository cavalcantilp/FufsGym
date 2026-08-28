import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { useWakeLock } from '../hooks/useWakeLock'
import { RestTimer, playChime } from './RestTimer'
import { RestTimerBanner } from './RestTimerBanner'

/**
 * Point unique de décompte du minuteur de repos, monté au niveau de l'appli
 * (donc jamais démonté par un changement d'onglet). Bascule entre l'affichage
 * plein écran et le bandeau réduit selon `activeRestTimer.minimized`, tous
 * deux dérivés du même chrono pour ne jamais désynchroniser l'un de l'autre.
 */
export function RestTimerHost() {
  const { activeRestTimer, extendRestTimer, minimizeRestTimer, restoreRestTimer, stopRestTimer } = useApp()
  useWakeLock(activeRestTimer !== null)
  const [now, setNow] = useState(() => Date.now())
  const firedKeyRef = useRef<number | null>(null)

  useEffect(() => {
    if (!activeRestTimer) return
    const interval = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(interval)
  }, [activeRestTimer?.key])

  const totalMs = activeRestTimer?.totalMs ?? 0
  const elapsedMs = activeRestTimer ? now - activeRestTimer.startedAt : 0
  const remainingMs = activeRestTimer ? Math.max(0, totalMs - elapsedMs) : 0
  const progress = activeRestTimer ? Math.min(1, elapsedMs / Math.max(1, totalMs)) : 0

  useEffect(() => {
    if (!activeRestTimer || remainingMs > 0) return
    if (firedKeyRef.current === activeRestTimer.key) return
    firedKeyRef.current = activeRestTimer.key
    playChime()
    const timeout = setTimeout(stopRestTimer, 1400)
    return () => clearTimeout(timeout)
  }, [activeRestTimer, remainingMs, stopRestTimer])

  if (!activeRestTimer) return null

  return activeRestTimer.minimized ? (
    <RestTimerBanner
      remainingMs={remainingMs}
      progress={progress}
      label={activeRestTimer.label}
      onExpand={restoreRestTimer}
      onSkip={stopRestTimer}
    />
  ) : (
    <RestTimer
      remainingMs={remainingMs}
      progress={progress}
      label={activeRestTimer.label}
      skipLabel={activeRestTimer.skipLabel}
      onAdjust={extendRestTimer}
      onMinimize={minimizeRestTimer}
      onSkip={stopRestTimer}
    />
  )
}
