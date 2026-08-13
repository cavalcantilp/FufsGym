export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio'

export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'wheel'

export type Lang = 'fr' | 'pt' | 'es' | 'en' | 'it'

export type WeightUnit = 'kg' | 'lb'
export type LengthUnit = 'cm' | 'in'

export interface Units {
  weight: WeightUnit
  length: LengthUnit
}

export interface Exercise {
  id: string
  /** Nom par défaut (français) ; utilisé tel quel pour les exercices personnalisés, sinon affiché via sa clé de traduction. */
  name: string
  muscle: MuscleGroup
  equipment?: Equipment
  custom?: boolean
}

/** Ligne d'un jour de programme : l'exercice visé et son objectif (séries × répétitions). */
export interface PlanExercise {
  id: string
  exerciseId: string
  sets: number
  /** Répétitions visées, en texte libre : "8-12", "AMRAP", "5". */
  reps: string
  restSec?: number
  note?: string
}

export interface PlanDay {
  id: string
  name: string
  exercises: PlanExercise[]
}

export interface Plan {
  id: string
  name: string
  days: PlanDay[]
  createdAt: string
}

export interface SetLog {
  id: string
  weight: number
  reps: number
  done: boolean
}

export interface SessionExercise {
  id: string
  exerciseId: string
  sets: SetLog[]
}

export interface Session {
  id: string
  /** Date au format YYYY-MM-DD. */
  date: string
  planId?: string
  dayId?: string
  /** Libellé figé au moment du lancement : la séance survit à la suppression du programme. */
  dayName?: string
  exercises: SessionExercise[]
  startedAt: string
  finishedAt?: string
  note?: string
}
