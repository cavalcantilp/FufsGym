/**
 * Correspondance entre nos exercices et des photos de démonstration (position de
 * départ / contraction), issues de free-exercise-db (github.com/yuhonas/free-exercise-db,
 * domaine public — Unlicense). Auto-hébergées dans public/exercise-media/<id>/, converties
 * en WebP et redimensionnées pour rester légères ; volontairement exclues du précache PWA
 * (chargées à la demande, pas au premier lancement).
 *
 * Certaines machines de marque (Life Fitness, Hammer Strength…) n'ont pas d'équivalent
 * exact dans la base : elles réutilisent la photo de l'exercice au mouvement le plus proche.
 */
export const EXERCISE_MEDIA: Record<string, string> = {
  'arms-barbell-curl': 'Barbell_Curl',
  'arms-biceps-curl-life-fitness': 'Machine_Preacher_Curls',
  'arms-close-grip-bench': 'Close-Grip_Barbell_Bench_Press',
  'arms-dumbbell-curl': 'Dumbbell_Bicep_Curl',
  'arms-hammer-curl': 'Hammer_Curls',
  'arms-preacher-curl': 'Preacher_Curl',
  'arms-skullcrusher': 'EZ-Bar_Skullcrusher',
  'arms-triceps-dip': 'Dips_-_Triceps_Version',
  'arms-triceps-extension-machine': 'Cable_Rope_Overhead_Triceps_Extension',
  'arms-triceps-press-life-fitness': 'Dip_Machine',
  'arms-triceps-pushdown': 'Triceps_Pushdown',
  'back-assisted-pullup': 'Band_Assisted_Pull-Up',
  'back-barbell-row': 'Bent_Over_Barbell_Row',
  'back-deadlift': 'Barbell_Deadlift',
  'back-dumbbell-row': 'One-Arm_Dumbbell_Row',
  'back-hyperextension': 'Hyperextensions_Back_Extensions',
  'back-lat-pulldown': 'Wide-Grip_Lat_Pulldown',
  'back-lat-pulldown-life-fitness': 'Wide-Grip_Lat_Pulldown',
  'back-pullup': 'Pullups',
  'back-seated-row': 'Seated_Cable_Rows',
  'back-seated-row-life-fitness': 'Seated_Cable_Rows',
  'cardio-cycling': 'Bicycling_Stationary',
  'cardio-echo-bike': 'Bicycling_Stationary',
  'cardio-elliptical': 'Elliptical_Trainer',
  'cardio-jump-rope': 'Rope_Jumping',
  'cardio-rowing': 'Rowing_Stationary',
  'cardio-running': 'Running_Treadmill',
  'cardio-stair-climber': 'Stairmaster',
  'chest-bench-press': 'Barbell_Bench_Press_-_Medium_Grip',
  'chest-cable-crossover': 'Cable_Crossover',
  'chest-dips': 'Dips_-_Chest_Version',
  'chest-dumbbell-press': 'Dumbbell_Bench_Press',
  'chest-flye': 'Dumbbell_Flyes',
  'chest-incline-bench': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'chest-machine-press': 'Leverage_Chest_Press',
  'chest-pec-deck': 'Butterfly',
  'chest-pushup': 'Pushups',
  'core-ab-wheel': 'Ab_Roller',
  'core-cable-crunch': 'Cable_Crunch',
  'core-crunch': 'Crunches',
  'core-leg-raise': 'Hanging_Leg_Raise',
  'core-plank': 'Plank',
  'core-russian-twist': 'Russian_Twist',
  'legs-calf-raise': 'Standing_Calf_Raises',
  'legs-front-squat': 'Front_Squat_Clean_Grip',
  'legs-hack-squat': 'Hack_Squat',
  'legs-hip-abduction': 'Thigh_Abductor',
  'legs-hip-adduction': 'Thigh_Adductor',
  'legs-hip-thrust': 'Barbell_Hip_Thrust',
  'legs-hip-thrust-machine': 'Barbell_Hip_Thrust',
  'legs-leg-curl': 'Lying_Leg_Curls',
  'legs-leg-extension': 'Leg_Extensions',
  'legs-leg-press': 'Leg_Press',
  'legs-lunge': 'Dumbbell_Lunges',
  'legs-romanian-deadlift': 'Romanian_Deadlift',
  'legs-squat': 'Barbell_Squat',
  'shoulders-dumbbell-press': 'Dumbbell_Shoulder_Press',
  'shoulders-face-pull': 'Face_Pull',
  'shoulders-front-raise': 'Front_Dumbbell_Raise',
  'shoulders-iso-lateral-press': 'Machine_Shoulder_Military_Press',
  'shoulders-lateral-raise': 'Side_Lateral_Raise',
  'shoulders-lateral-raise-machine': 'Cable_Seated_Lateral_Raise',
  'shoulders-lateral-raise-machine-hammer-strength': 'Cable_Seated_Lateral_Raise',
  'shoulders-lateral-raise-machine-life-fitness': 'Cable_Seated_Lateral_Raise',
  'shoulders-machine-press': 'Machine_Shoulder_Military_Press',
  'shoulders-military-press': 'Standing_Military_Press',
  'shoulders-rear-delt-flye': 'Seated_Bent-Over_Rear_Delt_Raise',
  'shoulders-rear-delt-flye-life-fitness': 'Cable_Rear_Delt_Fly',
  'shoulders-shrug': 'Barbell_Shrug',
}

/** URLs des deux photos de démonstration d'un exercice, ou `null` si aucune n'est disponible. */
export function exerciseMediaImages(exerciseId: string): [string, string] | null {
  const folder = EXERCISE_MEDIA[exerciseId]
  if (!folder) return null
  const base = `${import.meta.env.BASE_URL}exercise-media/${folder}`
  return [`${base}/0.webp`, `${base}/1.webp`]
}
