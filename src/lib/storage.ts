const PREFIX = 'fg.'

/**
 * Lecture tolérante : une clé absente, un JSON corrompu ou un localStorage
 * indisponible (navigation privée) retombent sur la valeur par défaut.
 */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Quota dépassé ou stockage refusé : la session reste utilisable en mémoire.
  }
}

export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Rien à faire.
  }
}

export const STORAGE_KEYS = {
  workouts: 'workouts',
  schedules: 'schedules',
  sessions: 'sessions',
  customExercises: 'customExercises',
  onboarded: 'onboarded',
  ui: 'ui',
  lang: 'lang',
  units: 'units',
  dayNotes: 'dayNotes',
} as const
