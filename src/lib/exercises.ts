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

/** Cardio ou maintien isométrique : chronométré, sans notion de séries × répétitions ni de charge. */
export function isDurationBased(exercise: Exercise): boolean {
  return exercise.muscle === 'cardio' || exercise.trackingType === 'duration'
}

function ex(
  id: string,
  name: string,
  muscle: MuscleGroup,
  equipment?: Equipment,
  trackingType?: Exercise['trackingType'],
): Exercise {
  return { id, name, muscle, equipment, trackingType }
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
  ex('chest-machine-press', 'Développé à la machine', 'chest', 'machine'),
  ex('chest-pec-deck', 'Écarté à la machine (pec deck)', 'chest', 'machine'),
  ex('chest-iso-lateral-incline-press', 'Développé incliné iso-latéral (Hammer Strength)', 'chest', 'machine'),
  ex('chest-iso-lateral-bench-press', 'Développé couché iso-latéral (Hammer Strength)', 'chest', 'machine'),
  ex('chest-scapular-pushdown-life-fitness', 'Scapular Push-down (Life Fitness)', 'chest', 'machine'),

  // Dos
  ex('back-pullup', 'Tractions', 'back', 'bodyweight'),
  ex('back-lat-pulldown', 'Tirage vertical', 'back', 'cable'),
  ex('back-lat-pulldown-life-fitness', 'Pulldown (Life Fitness)', 'back', 'machine'),
  ex('back-barbell-row', 'Rowing barre', 'back', 'barbell'),
  ex('back-dumbbell-row', 'Rowing haltère', 'back', 'dumbbell'),
  ex('back-seated-row', 'Tirage horizontal', 'back', 'cable'),
  ex('back-seated-row-life-fitness', 'Cable Row (Life Fitness)', 'back', 'machine'),
  ex('back-deadlift', 'Soulevé de terre', 'back', 'barbell'),
  ex('back-hyperextension', 'Extension lombaire', 'back', 'bodyweight'),
  ex('back-45-degree-back-extension-hammer-strength', '45-Degree Back Extension (Hammer Strength)', 'back', 'machine'),
  ex('back-assisted-pullup', 'Tractions assistées', 'back', 'machine'),
  ex('back-iso-lateral-high-row', 'Tirage haut iso-latéral (Hammer Strength)', 'back', 'machine'),
  ex('back-iso-lateral-low-row', 'Tirage bas iso-latéral (Hammer Strength)', 'back', 'machine'),

  // Jambes
  ex('legs-squat', 'Squat', 'legs', 'barbell'),
  ex('legs-front-squat', 'Squat avant', 'legs', 'barbell'),
  ex('legs-leg-press', 'Presse à cuisses', 'legs', 'machine'),
  ex('legs-lunge', 'Fentes', 'legs', 'dumbbell'),
  ex('legs-leg-extension', 'Leg extension', 'legs', 'machine'),
  ex('legs-leg-curl', 'Leg curl', 'legs', 'machine'),
  ex('legs-romanian-deadlift', 'Soulevé de terre roumain', 'legs', 'barbell'),
  ex('legs-calf-raise', 'Mollets debout', 'legs', 'machine'),
  ex('legs-hack-squat', 'Hack squat', 'legs', 'machine'),
  ex('legs-hip-adduction', 'Adducteurs (machine)', 'legs', 'machine'),
  ex('legs-hip-abduction', 'Abducteurs (machine)', 'legs', 'machine'),
  ex('legs-hip-thrust', 'Hip thrust', 'legs', 'barbell'),
  ex('legs-hip-thrust-machine', 'Hip thrust à la machine', 'legs', 'machine'),
  ex('legs-iso-lateral-leg-press', 'Presse à cuisses iso-latérale (Hammer Strength)', 'legs', 'machine'),
  ex('legs-seated-leg-curl-life-fitness', 'Seated Leg Curl (Life Fitness)', 'legs', 'machine'),
  ex('legs-leg-extension-life-fitness', 'Leg Extension (Life Fitness)', 'legs', 'machine'),

  // Épaules
  ex('shoulders-military-press', 'Développé militaire', 'shoulders', 'barbell'),
  ex('shoulders-dumbbell-press', 'Développé épaules haltères', 'shoulders', 'dumbbell'),
  ex('shoulders-lateral-raise', 'Élévations latérales', 'shoulders', 'dumbbell'),
  ex('shoulders-front-raise', 'Élévations frontales', 'shoulders', 'dumbbell'),
  ex('shoulders-rear-delt-flye', 'Oiseau', 'shoulders', 'dumbbell'),
  ex('shoulders-rear-delt-flye-life-fitness', 'Rear Delt (Life Fitness)', 'shoulders', 'machine'),
  ex('shoulders-face-pull', 'Face pull', 'shoulders', 'cable'),
  ex('shoulders-shrug', 'Haussements d’épaules', 'shoulders', 'barbell'),
  ex('shoulders-machine-press', 'Développé épaules à la machine', 'shoulders', 'machine'),
  ex('shoulders-lateral-raise-machine', 'Élévations latérales à la machine', 'shoulders', 'machine'),
  ex('shoulders-lateral-raise-machine-life-fitness', 'Élévation latérale machine (Life Fitness)', 'shoulders', 'machine'),
  ex('shoulders-lateral-raise-machine-hammer-strength', 'Élévation latérale machine (Hammer Strength)', 'shoulders', 'machine'),
  ex('shoulders-iso-lateral-press', 'Développé épaules iso-latéral (Hammer Strength)', 'shoulders', 'machine'),

  // Bras
  ex('arms-barbell-curl', 'Curl biceps barre', 'arms', 'barbell'),
  ex('arms-dumbbell-curl', 'Curl haltères', 'arms', 'dumbbell'),
  ex('arms-hammer-curl', 'Curl marteau', 'arms', 'dumbbell'),
  ex('arms-biceps-curl-life-fitness', 'Biceps Curl (Life Fitness)', 'arms', 'machine'),
  ex('arms-triceps-pushdown', 'Extension triceps poulie', 'arms', 'cable'),
  ex('arms-triceps-dip', 'Dips triceps', 'arms', 'bodyweight'),
  ex('arms-skullcrusher', 'Barre au front', 'arms', 'barbell'),
  ex('arms-close-grip-bench', 'Développé prise serrée', 'arms', 'barbell'),
  ex('arms-preacher-curl', 'Curl pupitre', 'arms', 'machine'),
  ex('arms-triceps-extension-machine', 'Extension triceps à la machine', 'arms', 'machine'),
  ex('arms-triceps-press-life-fitness', 'Triceps press (Life Fitness)', 'arms', 'machine'),
  ex('arms-iso-lateral-biceps-curl', 'Curl biceps iso-latéral (Hammer Strength)', 'arms', 'machine'),
  ex('arms-iso-lateral-triceps-dip', 'Dips triceps iso-latéral (Hammer Strength)', 'arms', 'machine'),
  ex('arms-seated-dip-hammer-strength', 'Seated Dip (Hammer Strength)', 'arms', 'machine'),

  // Abdominaux
  ex('core-crunch', 'Crunch', 'core', 'bodyweight'),
  ex('core-plank', 'Planche', 'core', 'bodyweight', 'duration'),
  ex('core-leg-raise', 'Relevé de jambes', 'core', 'bodyweight'),
  ex('core-russian-twist', 'Russian twist', 'core', 'bodyweight'),
  ex('core-ab-wheel', 'Roue abdominale', 'core', 'wheel'),
  ex('core-cable-crunch', 'Crunch à la poulie', 'core', 'cable'),
  ex('core-abdominal-crunch-machine-life-fitness', 'Abdominal Crunch Machine (Life Fitness)', 'core', 'machine'),
  ex('core-captains-chair-hammer-strength', "Captain's Chair (Hammer Strength)", 'core', 'machine'),
  ex('core-torso-rotation-life-fitness', 'Torso Rotation (Life Fitness)', 'core', 'machine'),
  ex('core-leg-lift-life-fitness', 'Leg Lift (Life Fitness)', 'core', 'machine'),

  // Cardio
  ex('cardio-running', 'Course à pied', 'cardio'),
  ex('cardio-cycling', 'Vélo', 'cardio'),
  ex('cardio-rowing', 'Rameur', 'cardio'),
  ex('cardio-jump-rope', 'Corde à sauter', 'cardio'),
  ex('cardio-elliptical', 'Elliptique', 'cardio'),
  ex('cardio-stair-climber', 'Stepper / Escaliers', 'cardio'),
  ex('cardio-echo-bike', 'Rogue Echo Bike', 'cardio'),
]
