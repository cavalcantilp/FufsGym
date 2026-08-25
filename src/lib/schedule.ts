import { fromKey } from './date'
import type { DaySchedule, ScheduleLetter, Weekday } from './types'

/** Lundi en tête, comme le reste de l'appli (calendrier, semaine de la barre d'onglets). */
export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const SCHEDULE_LETTERS: ScheduleLetter[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

/** Maximum de jours de programme différents pouvant tomber sur une même date. */
export const MAX_PER_DAY = 3

/** Une couleur bien distincte par lettre, indépendante des couleurs de groupe musculaire. */
export const LETTER_COLOR: Record<ScheduleLetter, string> = {
  A: '#ef4444',
  B: '#f97316',
  C: '#f59e0b',
  D: '#84cc16',
  E: '#22c55e',
  F: '#14b8a6',
  G: '#06b6d4',
  H: '#3b82f6',
  I: '#a855f7',
  J: '#ec4899',
}

export function weekdayOf(dateKey: string): Weekday {
  const jsDay = fromKey(dateKey).getDay()
  return WEEKDAYS[(jsDay + 6) % 7]
}

/** Une programmation s'applique à une date si le jour de semaine correspond et que la date est dans ses bornes. */
export function isScheduledOn(schedule: DaySchedule, dateKey: string): boolean {
  if (!schedule.weekdays.includes(weekdayOf(dateKey))) return false
  if (schedule.startDate && dateKey < schedule.startDate) return false
  if (schedule.createdAt && dateKey < schedule.createdAt) return false
  if (schedule.endDate && dateKey > schedule.endDate) return false
  return true
}

export function schedulesForDate(schedules: DaySchedule[], dateKey: string): DaySchedule[] {
  return schedules.filter((schedule) => isScheduledOn(schedule, dateKey))
}

/**
 * Combien de programmations (autres que `excludeId`) couvrent déjà ce jour de
 * semaine — approximation qui ignore le chevauchement fin des bornes de
 * dates : suffisant pour la limite de 3 par jour, sans complexité inutile.
 */
export function countByWeekday(schedules: DaySchedule[], weekday: Weekday, excludeId?: string): number {
  return schedules.filter((s) => s.id !== excludeId && s.weekdays.includes(weekday)).length
}

/** Prochaine lettre libre, dans l'ordre, ou `null` si les dix sont prises. */
export function nextFreeLetter(schedules: DaySchedule[]): ScheduleLetter | null {
  const used = new Set(schedules.map((s) => s.letter))
  return SCHEDULE_LETTERS.find((letter) => !used.has(letter)) ?? null
}
