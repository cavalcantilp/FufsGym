import type { TranslationKey } from '../i18n/translations'
import type { Equipment, Exercise, MuscleGroup } from './types'

export const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio']

export const MUSCLE_COLOR: Record<MuscleGroup, string> = {
  chest: 'var(--muscle-chest)',
  back: 'var(--muscle-back)',
  legs: 'var(--muscle-legs)',
  shoulders: 'var(--muscle-shoulders)',
  arms: 'var(--muscle-arms)',
  core: 'var(--muscle-core)',
  cardio: 'var(--muscle-cardio)',
}

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

export function muscleLabel(muscle: MuscleGroup, t: TFn): string {
  return t(`muscle.${muscle}` as TranslationKey)
}

export function equipmentLabel(equipment: Equipment, t: TFn): string {
  return t(`equipment.${equipment}` as TranslationKey)
}

/** Nom affiché : traduit pour le catalogue intégré, tel quel pour les exercices personnalisés. */
export function exerciseName(exercise: Exercise, t: TFn): string {
  if (exercise.custom) return exercise.name
  return t(`exercise.${exercise.id}` as TranslationKey)
}

function ex(id: string, name: string, muscle: MuscleGroup, equipment?: Equipment): Exercise {
  return { id, name, muscle, equipment }
}

/**
 * Catalogue d'exercices courants, par groupe musculaire. `name` est le libellé
 * français de secours ; l'affichage passe par `exerciseName()`, qui résout la
 * traduction via la clé `exercise.<id>` dans la langue active.
 */
export const BUILTIN_EXERCISES: Exercise[] = [
  // Pectoraux
  ex('chest-bench-press', 'Développé couché', 'chest', 'barbell'),
  ex('chest-incline-bench', 'Développé incliné', 'chest', 'barbell'),
  ex('chest-dumbbell-press', 'Développé couché haltères', 'chest', 'dumbbell'),
  ex('chest-flye', 'Écarté couché', 'chest', 'dumbbell'),
  ex('chest-dips', 'Dips', 'chest', 'bodyweight'),
  ex('chest-pushup', 'Pompes', 'chest', 'bodyweight'),
  ex('chest-cable-crossover', 'Écarté à la poulie', 'chest', 'cable'),

  // Dos
  ex('back-pullup', 'Tractions', 'back', 'bodyweight'),
  ex('back-lat-pulldown', 'Tirage vertical', 'back', 'cable'),
  ex('back-barbell-row', 'Rowing barre', 'back', 'barbell'),
  ex('back-dumbbell-row', 'Rowing haltère', 'back', 'dumbbell'),
  ex('back-seated-row', 'Tirage horizontal', 'back', 'cable'),
  ex('back-deadlift', 'Soulevé de terre', 'back', 'barbell'),
  ex('back-hyperextension', 'Extension lombaire', 'back', 'bodyweight'),

  // Jambes
  ex('legs-squat', 'Squat', 'legs', 'barbell'),
  ex('legs-front-squat', 'Squat avant', 'legs', 'barbell'),
  ex('legs-leg-press', 'Presse à cuisses', 'legs', 'machine'),
  ex('legs-lunge', 'Fentes', 'legs', 'dumbbell'),
  ex('legs-leg-extension', 'Leg extension', 'legs', 'machine'),
  ex('legs-leg-curl', 'Leg curl', 'legs', 'machine'),
  ex('legs-romanian-deadlift', 'Soulevé de terre roumain', 'legs', 'barbell'),
  ex('legs-calf-raise', 'Mollets debout', 'legs', 'machine'),

  // Épaules
  ex('shoulders-military-press', 'Développé militaire', 'shoulders', 'barbell'),
  ex('shoulders-dumbbell-press', 'Développé épaules haltères', 'shoulders', 'dumbbell'),
  ex('shoulders-lateral-raise', 'Élévations latérales', 'shoulders', 'dumbbell'),
  ex('shoulders-front-raise', 'Élévations frontales', 'shoulders', 'dumbbell'),
  ex('shoulders-rear-delt-flye', 'Oiseau', 'shoulders', 'dumbbell'),
  ex('shoulders-face-pull', 'Face pull', 'shoulders', 'cable'),
  ex('shoulders-shrug', 'Haussements d’épaules', 'shoulders', 'barbell'),

  // Bras
  ex('arms-barbell-curl', 'Curl biceps barre', 'arms', 'barbell'),
  ex('arms-dumbbell-curl', 'Curl haltères', 'arms', 'dumbbell'),
  ex('arms-hammer-curl', 'Curl marteau', 'arms', 'dumbbell'),
  ex('arms-triceps-pushdown', 'Extension triceps poulie', 'arms', 'cable'),
  ex('arms-triceps-dip', 'Dips triceps', 'arms', 'bodyweight'),
  ex('arms-skullcrusher', 'Barre au front', 'arms', 'barbell'),
  ex('arms-close-grip-bench', 'Développé prise serrée', 'arms', 'barbell'),

  // Abdominaux
  ex('core-crunch', 'Crunch', 'core', 'bodyweight'),
  ex('core-plank', 'Planche', 'core', 'bodyweight'),
  ex('core-leg-raise', 'Relevé de jambes', 'core', 'bodyweight'),
  ex('core-russian-twist', 'Russian twist', 'core', 'bodyweight'),
  ex('core-ab-wheel', 'Roue abdominale', 'core', 'wheel'),
  ex('core-cable-crunch', 'Crunch à la poulie', 'core', 'cable'),

  // Cardio
  ex('cardio-running', 'Course à pied', 'cardio'),
  ex('cardio-cycling', 'Vélo', 'cardio'),
  ex('cardio-rowing', 'Rameur', 'cardio'),
  ex('cardio-jump-rope', 'Corde à sauter', 'cardio'),
]
