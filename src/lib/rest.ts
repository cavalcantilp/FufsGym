/** Repos par défaut entre deux séries quand rien n'a été configuré côté programme. */
export const DEFAULT_REST_SEC = 90

/** Pas d'ajustement du temps de repos, en secondes — dans le programme, en séance, et pour le "+15s" du minuteur. */
export const REST_STEP_SEC = 15

export const MIN_REST_SEC = 0

/** "1:30", "0:45" — jamais négatif, secondes toujours sur deux chiffres. */
export function formatRestTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}
