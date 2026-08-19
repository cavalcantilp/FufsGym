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

/** Ligne d'un entraînement : l'exercice visé et son objectif (séries × répétitions). */
export interface PlanExercise {
  id: string
  exerciseId: string
  sets: number
  /** Répétitions visées, en texte libre : "8-12", "AMRAP", "5". */
  reps: string
  restSec?: number
  note?: string
  /** Superset : cet exercice s'enchaîne avec le suivant dans la liste, sans repos entre les deux. */
  linkedToNext?: boolean
}

/** Un entraînement : une liste nommée d'exercices (ex. "Push"). Rien au-dessus — pas de regroupement en "programme". */
export interface Workout {
  id: string
  name: string
  exercises: PlanExercise[]
  createdAt: string
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

/** Dix lettres possibles, au total sur l'appli : au-delà, il faut en libérer une avant d'en programmer un nouveau. */
export type ScheduleLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'

/**
 * Récurrence hebdomadaire d'un entraînement : quand il revient (jours de la
 * semaine, bornes de dates facultatives) et sa lettre d'identification sur le
 * calendrier. Un entraînement a au plus une programmation à la fois.
 */
export interface DaySchedule {
  id: string
  workoutId: string
  letter: ScheduleLetter
  weekdays: Weekday[]
  /** Date au format YYYY-MM-DD ; illimité si absente. */
  startDate?: string
  endDate?: string
}

export interface SetLog {
  id: string
  weight: number
  reps: number
  /** Pour une série cardio : durée en minutes, distance en km. Non pertinent (et laissés à 0) sur un exercice de force. */
  durationMin?: number
  distanceKm?: number
  done: boolean
}

export interface SessionExercise {
  id: string
  exerciseId: string
  sets: SetLog[]
  /** Repos entre séries pour cette séance : hérité du programme au lancement, modifiable ensuite. */
  restSec: number
  /** Hérité du programme : superset avec l'exercice suivant, pas de repos déclenché avant la fin de la série. */
  linkedToNext?: boolean
}

export interface Session {
  id: string
  /** Date au format YYYY-MM-DD. */
  date: string
  workoutId?: string
  /** Libellé figé au moment du lancement : la séance survit à la suppression de l'entraînement. */
  workoutName?: string
  exercises: SessionExercise[]
  startedAt: string
  finishedAt?: string
  note?: string
}
