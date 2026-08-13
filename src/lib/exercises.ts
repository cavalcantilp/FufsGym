import type { Exercise, MuscleGroup } from './types'

export const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio']

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Pectoraux',
  back: 'Dos',
  legs: 'Jambes',
  shoulders: 'Épaules',
  arms: 'Bras',
  core: 'Abdominaux',
  cardio: 'Cardio',
}

export const MUSCLE_COLOR: Record<MuscleGroup, string> = {
  chest: 'var(--muscle-chest)',
  back: 'var(--muscle-back)',
  legs: 'var(--muscle-legs)',
  shoulders: 'var(--muscle-shoulders)',
  arms: 'var(--muscle-arms)',
  core: 'var(--muscle-core)',
  cardio: 'var(--muscle-cardio)',
}

function ex(id: string, name: string, muscle: MuscleGroup, equipment?: string): Exercise {
  return { id, name, muscle, equipment }
}

/** Catalogue d'exercices courants, par groupe musculaire. Complétable par l'utilisateur. */
export const BUILTIN_EXERCISES: Exercise[] = [
  // Pectoraux
  ex('chest-bench-press', 'Développé couché', 'chest', 'Barre'),
  ex('chest-incline-bench', 'Développé incliné', 'chest', 'Barre'),
  ex('chest-dumbbell-press', 'Développé couché haltères', 'chest', 'Haltères'),
  ex('chest-flye', 'Écarté couché', 'chest', 'Haltères'),
  ex('chest-dips', 'Dips', 'chest', 'Poids du corps'),
  ex('chest-pushup', 'Pompes', 'chest', 'Poids du corps'),
  ex('chest-cable-crossover', 'Écarté à la poulie', 'chest', 'Poulie'),

  // Dos
  ex('back-pullup', 'Tractions', 'back', 'Poids du corps'),
  ex('back-lat-pulldown', 'Tirage vertical', 'back', 'Poulie'),
  ex('back-barbell-row', 'Rowing barre', 'back', 'Barre'),
  ex('back-dumbbell-row', 'Rowing haltère', 'back', 'Haltère'),
  ex('back-seated-row', 'Tirage horizontal', 'back', 'Poulie'),
  ex('back-deadlift', 'Soulevé de terre', 'back', 'Barre'),
  ex('back-hyperextension', 'Extension lombaire', 'back', 'Poids du corps'),

  // Jambes
  ex('legs-squat', 'Squat', 'legs', 'Barre'),
  ex('legs-front-squat', 'Squat avant', 'legs', 'Barre'),
  ex('legs-leg-press', 'Presse à cuisses', 'legs', 'Machine'),
  ex('legs-lunge', 'Fentes', 'legs', 'Haltères'),
  ex('legs-leg-extension', 'Leg extension', 'legs', 'Machine'),
  ex('legs-leg-curl', 'Leg curl', 'legs', 'Machine'),
  ex('legs-romanian-deadlift', 'Soulevé de terre roumain', 'legs', 'Barre'),
  ex('legs-calf-raise', 'Mollets debout', 'legs', 'Machine'),

  // Épaules
  ex('shoulders-military-press', 'Développé militaire', 'shoulders', 'Barre'),
  ex('shoulders-dumbbell-press', 'Développé épaules haltères', 'shoulders', 'Haltères'),
  ex('shoulders-lateral-raise', 'Élévations latérales', 'shoulders', 'Haltères'),
  ex('shoulders-front-raise', 'Élévations frontales', 'shoulders', 'Haltères'),
  ex('shoulders-rear-delt-flye', 'Oiseau', 'shoulders', 'Haltères'),
  ex('shoulders-face-pull', 'Face pull', 'shoulders', 'Poulie'),
  ex('shoulders-shrug', 'Haussements d’épaules', 'shoulders', 'Barre'),

  // Bras
  ex('arms-barbell-curl', 'Curl biceps barre', 'arms', 'Barre'),
  ex('arms-dumbbell-curl', 'Curl haltères', 'arms', 'Haltères'),
  ex('arms-hammer-curl', 'Curl marteau', 'arms', 'Haltères'),
  ex('arms-triceps-pushdown', 'Extension triceps poulie', 'arms', 'Poulie'),
  ex('arms-triceps-dip', 'Dips triceps', 'arms', 'Poids du corps'),
  ex('arms-skullcrusher', 'Barre au front', 'arms', 'Barre'),
  ex('arms-close-grip-bench', 'Développé prise serrée', 'arms', 'Barre'),

  // Abdominaux
  ex('core-crunch', 'Crunch', 'core', 'Poids du corps'),
  ex('core-plank', 'Planche', 'core', 'Poids du corps'),
  ex('core-leg-raise', 'Relevé de jambes', 'core', 'Poids du corps'),
  ex('core-russian-twist', 'Russian twist', 'core', 'Poids du corps'),
  ex('core-ab-wheel', 'Roue abdominale', 'core', 'Roue'),
  ex('core-cable-crunch', 'Crunch à la poulie', 'core', 'Poulie'),

  // Cardio
  ex('cardio-running', 'Course à pied', 'cardio'),
  ex('cardio-cycling', 'Vélo', 'cardio'),
  ex('cardio-rowing', 'Rameur', 'cardio'),
  ex('cardio-jump-rope', 'Corde à sauter', 'cardio'),
]
