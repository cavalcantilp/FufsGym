import { schedulesForDate } from './schedule'
import type { DaySchedule, Exercise, Session, SetLog } from './types'

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

/** Séances terminées avec entraînement identifié, regroupées par date. */
function doneWorkoutIdsByDate(sessions: Session[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const session of sessions) {
    if (!session.finishedAt || !session.workoutId) continue
    const set = map.get(session.date) ?? new Set<string>()
    set.add(session.workoutId)
    map.set(session.date, set)
  }
  return map
}

/** Un jour est honoré si tous les entraînements programmés ce jour-là ont été réalisés. */
function isDayHonored(date: string, schedules: DaySchedule[], done: Map<string, Set<string>>): boolean | null {
  const daySchedules = schedulesForDate(schedules, date)
  if (daySchedules.length === 0) return null
  return daySchedules.every((schedule) => done.get(date)?.has(schedule.workoutId) ?? false)
}

/**
 * Série de jours d'adhésion au programme planifié, en remontant depuis
 * aujourd'hui. Les jours sans entraînement programmé sont ignorés (ni
 * casse, ni prolonge la série) ; un jour programmé non honoré casse la
 * série, sauf s'il s'agit d'aujourd'hui (pas encore terminé).
 */
export function plannedStreak(sessions: Session[], schedules: DaySchedule[], today: string): number {
  const done = doneWorkoutIdsByDate(sessions)
  let cursor = today
  let streak = 0
  for (let i = 0; i < 3660; i++) {
    const honored = isDayHonored(cursor, schedules, done)
    if (honored === null) {
      cursor = shiftDayLocal(cursor, -1)
      continue
    }
    if (!honored) {
      if (cursor === today) {
        cursor = shiftDayLocal(cursor, -1)
        continue
      }
      break
    }
    streak += 1
    cursor = shiftDayLocal(cursor, -1)
  }
  return streak
}

/** Plus longue série d'adhésion au programme planifié jamais atteinte. */
export function longestPlannedStreak(sessions: Session[], schedules: DaySchedule[], today: string): number {
  const done = doneWorkoutIdsByDate(sessions)
  const scheduleDates = schedules.map((s) => s.createdAt || s.startDate).filter((d): d is string => Boolean(d))
  const sessionDates = sessions.map((s) => s.date)
  const allDates = [...scheduleDates, ...sessionDates]
  if (allDates.length === 0) return 0
  let cursor = allDates.reduce((min, d) => (d < min ? d : min))
  let best = 0
  let current = 0
  for (let i = 0; i < 3660 && cursor <= today; i++) {
    const honored = isDayHonored(cursor, schedules, done)
    if (honored === true) {
      current += 1
      best = Math.max(best, current)
    } else if (honored === false && cursor !== today) {
      current = 0
    }
    cursor = shiftDayLocal(cursor, 1)
  }
  return best
}

function shiftDayLocal(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}
