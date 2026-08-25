import type { TranslationKey } from '../i18n/translations'
import { isDurationBased } from './exercises'
import { formatRestTime } from './rest'
import type { Exercise, PlanExercise, Session, Workout } from './types'

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

/** Reconstitue les objectifs (séries × reps, repos) d'un entraînement à partir d'une séance. */
export function buildPlanExercises(
  session: Session,
  workouts: Workout[],
  exerciseById: (id: string) => Exercise | undefined,
  t: TFn,
): Omit<PlanExercise, 'id'>[] {
  const sourceWorkout = session.workoutId ? workouts.find((w) => w.id === session.workoutId) : undefined
  return session.exercises.map((sessionExercise) => {
    const original = sourceWorkout?.exercises.find((entry) => entry.exerciseId === sessionExercise.exerciseId)
    const info = exerciseById(sessionExercise.exerciseId)
    const isCardio = info?.muscle === 'cardio'
    const isHold = Boolean(info && isDurationBased(info) && !isCardio)
    const firstSet = sessionExercise.sets[0]

    let reps = original?.reps
    if (!reps) {
      if (isHold) {
        reps = firstSet?.durationSec ? formatRestTime(firstSet.durationSec) : t('planEx.holdDurationPlaceholder')
      } else if (isCardio) {
        if (firstSet?.durationMin) reps = `${firstSet.durationMin} min`
        else if (firstSet?.distanceKm) reps = `${firstSet.distanceKm} km`
        else reps = t('planEx.durationPlaceholder')
      } else {
        reps = firstSet?.reps ? String(firstSet.reps) : t('planEx.repsPlaceholder')
      }
    }

    return {
      exerciseId: sessionExercise.exerciseId,
      sets: isCardio ? 1 : sessionExercise.sets.length,
      reps,
      restSec: sessionExercise.restSec,
      linkedToNext: sessionExercise.linkedToNext,
    }
  })
}

/** Premier suffixe "_1", "_2"… libre pour ce nom, en cas de conflit refusé par l'utilisateur. */
export function nextAvailableName(base: string, workouts: Workout[]): string {
  const existing = new Set(workouts.map((w) => w.name.trim().toLowerCase()))
  let index = 1
  let candidate = `${base}_${index}`
  while (existing.has(candidate.toLowerCase())) {
    index += 1
    candidate = `${base}_${index}`
  }
  return candidate
}
