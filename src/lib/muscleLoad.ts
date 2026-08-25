import { estimate1RM, setVolume } from './stats'
import { EXERCISE_ACTIVATION } from './exerciseActivation'
import type { Session, SetLog } from './types'

export interface MuscleLoadResult {
  /** Charge pondérée totale par muscle précis (identifiant `body-muscles`, ex. "chest-upper-left"). */
  byMuscle: Record<string, number>
}

/**
 * Grandeur mesurée pour la heat map. Le volume (poids × répétitions) ne dit rien
 * des exercices au poids du corps (abdos, tractions...) puisqu'aucune charge n'y
 * est enregistrée : répétitions ou séries restent pertinentes pour ces exercices-là.
 */
export type MuscleLoadCriterion = 'volume' | 'reps' | 'sets'

function setAmount(set: SetLog, criterion: MuscleLoadCriterion): number {
  if (criterion === 'sets') return 1
  if (criterion === 'reps') return set.reps
  return setVolume(set)
}

/**
 * Charge d'entraînement par muscle sur une période : pour chaque série validée d'un
 * exercice ayant une carte d'activation, sa grandeur (volume, répétitions ou nombre
 * de séries selon `criterion`) est répartie entre les muscles sollicités au prorata
 * de leur intensité dans cet exercice précis (un muscle secondaire compte moins
 * qu'un moteur principal). Les exercices sans carte d'activation (cardio) n'y
 * contribuent pas.
 */
export function computeMuscleLoad(
  sessions: Session[],
  fromDate: string | null,
  toDate: string,
  criterion: MuscleLoadCriterion = 'volume',
): MuscleLoadResult {
  const byMuscle: Record<string, number> = {}

  for (const session of sessions) {
    if (session.date > toDate) continue
    if (fromDate && session.date < fromDate) continue

    for (const exercise of session.exercises) {
      const activation = EXERCISE_ACTIVATION[exercise.exerciseId]
      if (!activation) continue

      const amount = exercise.sets
        .filter((set) => set.done)
        .reduce((sum, set) => sum + setAmount(set, criterion), 0)
      if (amount <= 0) continue

      for (const [muscleId, intensity] of Object.entries(activation)) {
        byMuscle[muscleId] = (byMuscle[muscleId] ?? 0) + amount * intensity
      }
    }
  }

  return { byMuscle }
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

/** Intensité (0-1) d'un muscle de base dans la carte d'activation d'un exercice — gauche/droite étant toujours identiques. */
function activationForBaseMuscle(exerciseId: string, baseMuscleId: string): number {
  const activation = EXERCISE_ACTIVATION[exerciseId]
  if (!activation) return 0
  return activation[`${baseMuscleId}-left`] ?? activation[`${baseMuscleId}-right`] ?? activation[baseMuscleId] ?? 0
}

export interface MuscleEngagement {
  exerciseId: string
  /** Intensité de ce muscle dans cet exercice, en pourcentage (0-100). */
  engagementPct: number
}

/** Tous les exercices du catalogue sollicitant un muscle de base donné, classés du plus au moins engagé — indépendant de l'historique. */
export function exercisesEngagingMuscle(baseMuscleId: string): MuscleEngagement[] {
  return Object.keys(EXERCISE_ACTIVATION)
    .map((exerciseId) => ({ exerciseId, engagementPct: activationForBaseMuscle(exerciseId, baseMuscleId) * 100 }))
    .filter((row) => row.engagementPct > 0)
    .sort((a, b) => b.engagementPct - a.engagementPct)
}

export interface MuscleExercisePerformance extends MuscleEngagement {
  /** Volume total (poids × répétitions) de l'exercice sur la période, séries validées uniquement. */
  volume: number
  /** Nombre de séances distinctes où l'exercice a été réalisé sur la période. */
  sessionsCount: number
  /** Charge maximale (une répétition) soulevée sur la période. */
  maxLoad: number
  /** Meilleure estimation de 1RM (formule d'Epley) atteinte sur la période. */
  estRM: number
}

/**
 * Exercices effectivement réalisés sur la période et sollicitant ce muscle, avec
 * leurs statistiques de performance (indépendantes de la pondération musculaire :
 * le volume, la charge et le 1RM sont ceux de l'exercice lui-même).
 */
export function performedExercisesForMuscle(
  sessions: Session[],
  baseMuscleId: string,
  fromDate: string | null,
  toDate: string,
): MuscleExercisePerformance[] {
  const byExercise: Record<string, { volume: number; sessionIds: Set<string>; maxLoad: number; estRM: number }> = {}

  for (const session of sessions) {
    if (session.date > toDate) continue
    if (fromDate && session.date < fromDate) continue

    for (const exercise of session.exercises) {
      if (activationForBaseMuscle(exercise.exerciseId, baseMuscleId) <= 0) continue
      const doneSets = exercise.sets.filter((set) => set.done)
      if (!doneSets.length) continue

      const entry = (byExercise[exercise.exerciseId] ??= {
        volume: 0,
        sessionIds: new Set(),
        maxLoad: 0,
        estRM: 0,
      })
      entry.sessionIds.add(session.id)
      for (const set of doneSets) {
        entry.volume += setVolume(set)
        entry.maxLoad = Math.max(entry.maxLoad, set.weight)
        if (set.weight > 0 && set.reps > 0) {
          entry.estRM = Math.max(entry.estRM, estimate1RM(set.weight, set.reps))
        }
      }
    }
  }

  return Object.entries(byExercise).map(([exerciseId, data]) => ({
    exerciseId,
    volume: data.volume,
    sessionsCount: data.sessionIds.size,
    maxLoad: data.maxLoad,
    estRM: data.estRM,
    engagementPct: activationForBaseMuscle(exerciseId, baseMuscleId) * 100,
  }))
}
