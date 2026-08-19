import type { Exercise, Session, SetLog } from './types'

/** Arrondi à une décimale : évite les 62.500000000001 issus des calculs flottants. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Formule d'Epley : estimation du 1RM (charge soulevable une seule fois) à
 * partir d'une série sous-maximale. Référence standard, simple et suffisamment
 * fiable jusqu'à une dizaine de répétitions.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 1) return weight
  return round1(weight * (1 + reps / 30))
}

/** Volume d'une série : charge × répétitions. */
export function setVolume(set: SetLog): number {
  return set.weight * set.reps
}

/** Volume total d'une séance, séries validées uniquement. */
export function sessionVolume(session: Session): number {
  return session.exercises.reduce(
    (sum, exercise) =>
      sum + exercise.sets.filter((set) => set.done).reduce((s, set) => s + setVolume(set), 0),
    0,
  )
}

/** Type(s) pratiqués dans une séance (force et/ou cardio), dans l'ordre des exercices ajoutés. */
export function sessionTypes(
  session: Session,
  exerciseById: (id: string) => Exercise | undefined,
): ('strength' | 'cardio')[] {
  const order: ('strength' | 'cardio')[] = []
  for (const entry of session.exercises) {
    const info = exerciseById(entry.exerciseId)
    if (!info) continue
    const type = info.muscle === 'cardio' ? 'cardio' : 'strength'
    if (!order.includes(type)) order.push(type)
  }
  return order
}

/** Nombre de séries validées dans une séance. */
export function sessionSetCount(session: Session): number {
  return session.exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.done).length, 0)
}

/** Meilleure estimation de 1RM atteinte pour un exercice, toutes séances confondues. */
export function bestEstimate1RM(sessions: Session[], exerciseId: string): { date: string; value: number } | null {
  let best: { date: string; value: number } | null = null
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue
      for (const set of exercise.sets) {
        if (!set.done || set.weight <= 0 || set.reps <= 0) continue
        const value = estimate1RM(set.weight, set.reps)
        if (!best || value > best.value) best = { date: session.date, value }
      }
    }
  }
  return best
}

/** Plus lourde charge jamais soulevée pour un exercice, quelle que soit la répétition. */
export function bestWeight(sessions: Session[], exerciseId: string): { date: string; value: number } | null {
  let best: { date: string; value: number } | null = null
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue
      for (const set of exercise.sets) {
        if (!set.done || set.weight <= 0) continue
        if (!best || set.weight > best.value) best = { date: session.date, value: set.weight }
      }
    }
  }
  return best
}

/**
 * Points 1RM estimé au fil du temps pour un exercice : le meilleur set de
 * chaque séance, une seule valeur par jour pour ne pas surcharger la courbe.
 */
export function oneRepMaxSeries(sessions: Session[], exerciseId: string): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = []
  for (const session of sessions) {
    let best = 0
    for (const exercise of session.exercises) {
      if (exercise.exerciseId !== exerciseId) continue
      for (const set of exercise.sets) {
        if (!set.done || set.weight <= 0 || set.reps <= 0) continue
        best = Math.max(best, estimate1RM(set.weight, set.reps))
      }
    }
    if (best > 0) points.push({ date: session.date, value: best })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

/** Volume total par séance, trié par date croissante — pour la courbe de charge globale. */
export function volumeSeries(sessions: Session[]): { date: string; value: number }[] {
  return sessions
    .map((session) => ({ date: session.date, value: round1(sessionVolume(session)) }))
    .filter((point) => point.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Identifiants des exercices ayant au moins une série validée, dans l'ordre de leur dernière séance. */
export function trainedExerciseIds(sessions: Session[]): string[] {
  const seen = new Map<string, string>()
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (!exercise.sets.some((set) => set.done && set.weight > 0)) continue
      const previous = seen.get(exercise.exerciseId)
      if (!previous || session.date > previous) seen.set(exercise.exerciseId, session.date)
    }
  }
  return Array.from(seen.entries())
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id]) => id)
}

/**
 * Série de jours d'entraînement consécutifs, en remontant depuis aujourd'hui
 * (ou hier si aujourd'hui n'a pas encore de séance). Un jour sans séance
 * casse la série.
 */
export function trainingStreak(sessions: Session[], today: string): number {
  const trainedDays = new Set(sessions.filter((session) => session.finishedAt).map((session) => session.date))
  let cursor = trainedDays.has(today) ? today : shiftDayLocal(today, -1)
  let streak = 0
  for (let i = 0; i < 366; i++) {
    if (!trainedDays.has(cursor)) break
    streak += 1
    cursor = shiftDayLocal(cursor, -1)
  }
  return streak
}

function shiftDayLocal(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}
