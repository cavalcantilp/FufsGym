import { EXERCISE_ACTIVATION } from './exerciseActivation'
import { setVolume } from './stats'
import type { Session } from './types'

export interface MuscleLoadResult {
  /** Charge pondérée totale par muscle précis (identifiant `body-muscles`, ex. "chest-upper-left"). */
  byMuscle: Record<string, number>
  /** Même charge, détaillée par exercice contributeur — sert au classement au clic sur un muscle. */
  byMuscleByExercise: Record<string, Record<string, number>>
}

/**
 * Charge d'entraînement par muscle sur une période : pour chaque série validée d'un
 * exercice ayant une carte d'activation, son volume (poids × répétitions, comme le
 * reste de l'appli) est réparti entre les muscles sollicités au prorata de leur
 * intensité dans cet exercice précis (un muscle secondaire compte moins qu'un
 * moteur principal). Les exercices sans carte d'activation (cardio) n'y contribuent pas.
 */
export function computeMuscleLoad(sessions: Session[], fromDate: string | null, toDate: string): MuscleLoadResult {
  const byMuscle: Record<string, number> = {}
  const byMuscleByExercise: Record<string, Record<string, number>> = {}

  for (const session of sessions) {
    if (session.date > toDate) continue
    if (fromDate && session.date < fromDate) continue

    for (const exercise of session.exercises) {
      const activation = EXERCISE_ACTIVATION[exercise.exerciseId]
      if (!activation) continue

      const volume = exercise.sets.filter((set) => set.done).reduce((sum, set) => sum + setVolume(set), 0)
      if (volume <= 0) continue

      for (const [muscleId, intensity] of Object.entries(activation)) {
        const contribution = volume * intensity
        byMuscle[muscleId] = (byMuscle[muscleId] ?? 0) + contribution
        const byExercise = (byMuscleByExercise[muscleId] ??= {})
        byExercise[exercise.exerciseId] = (byExercise[exercise.exerciseId] ?? 0) + contribution
      }
    }
  }

  return { byMuscle, byMuscleByExercise }
}

/** Identifiant de muscle sans son côté ("chest-upper-left" → "chest-upper"), pour regrouper gauche/droite. */
export function muscleBaseId(muscleId: string): string {
  return muscleId.replace(/-(left|right)$/, '')
}

/** Tous les muscles de base pouvant apparaître dans une carte d'activation, dans un ordre stable. */
export const ALL_BASE_MUSCLES: string[] = Array.from(
  new Set(Object.values(EXERCISE_ACTIVATION).flatMap((activation) => Object.keys(activation).map(muscleBaseId))),
).sort()

/** Regroupe une charge par muscle précis (gauche/droite séparés) en charge par muscle de base (les deux côtés cumulés). */
export function aggregateByBaseMuscle(byMuscle: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [muscleId, value] of Object.entries(byMuscle)) {
    const base = muscleBaseId(muscleId)
    result[base] = (result[base] ?? 0) + value
  }
  return result
}

/** Classement décroissant des exercices contribuant à un muscle de base donné (gauche + droite cumulés). */
export function exercisesForBaseMuscle(
  byMuscleByExercise: Record<string, Record<string, number>>,
  baseMuscleId: string,
): { exerciseId: string; value: number }[] {
  const totals: Record<string, number> = {}
  for (const [muscleId, byExercise] of Object.entries(byMuscleByExercise)) {
    if (muscleBaseId(muscleId) !== baseMuscleId) continue
    for (const [exerciseId, value] of Object.entries(byExercise)) {
      totals[exerciseId] = (totals[exerciseId] ?? 0) + value
    }
  }
  return Object.entries(totals)
    .map(([exerciseId, value]) => ({ exerciseId, value }))
    .sort((a, b) => b.value - a.value)
}
