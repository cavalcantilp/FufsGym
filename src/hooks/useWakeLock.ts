import { useEffect } from 'react'

/** Empêche l'écran de s'éteindre tant que `enabled` est vrai ; ré-acquis si l'onglet redevient visible. */
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let sentinel: WakeLockSentinel | null = null

    const acquire = async () => {
      try {
        if (!('wakeLock' in navigator)) return
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
        } else {
          sentinel = lock
        }
      } catch {
        // Refusé (économie d'énergie, hors focus…) : l'écran reste utilisable sans lui.
      }
    }

    acquire()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !sentinel) acquire()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinel?.release().catch(() => {})
    }
  }, [enabled])
}
