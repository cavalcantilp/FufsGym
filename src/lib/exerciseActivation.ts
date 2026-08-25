/**
 * Carte d'activation musculaire par exercice : intensité 0-1 par muscle précis
 * (identifiants du paquet `body-muscles`), pas juste par grand groupe. 1 = moteur
 * principal, ~0.5 = synergiste, ~0.2 = simple stabilisateur. Les exercices cardio
 * n'ont volontairement pas d'entrée : le schéma reste masqué pour eux, comme les
 * photos de démonstration le faisaient déjà pour les mouvements sans zone ciblée.
 */

type Activation = Record<string, number>

/** Active le même muscle des deux côtés du corps (nos exercices sont toujours bilatéraux). */
function bi(id: string, value: number): Activation {
  return { [`${id}-left`]: value, [`${id}-right`]: value }
}

function merge(...maps: Activation[]): Activation {
  return Object.assign({}, ...maps)
}

export const EXERCISE_ACTIVATION: Record<string, Activation> = {
  // Pectoraux
  'chest-bench-press': merge(
    bi('chest-lower', 1),
    bi('chest-upper', 0.4),
    bi('shoulder-front', 0.5),
    bi('triceps-long', 0.45),
    bi('triceps-lateral', 0.45),
  ),
  'chest-incline-bench': merge(
    bi('chest-upper', 1),
    bi('chest-lower', 0.35),
    bi('shoulder-front', 0.55),
    bi('triceps-long', 0.4),
    bi('triceps-lateral', 0.4),
    bi('serratus-anterior', 0.15),
  ),
  'chest-dumbbell-press': merge(
    bi('chest-lower', 1),
    bi('chest-upper', 0.45),
    bi('shoulder-front', 0.55),
    bi('triceps-long', 0.4),
    bi('triceps-lateral', 0.4),
  ),
  'chest-flye': merge(bi('chest-lower', 0.9), bi('chest-upper', 0.9), bi('shoulder-front', 0.3)),
  'chest-dips': merge(
    bi('chest-lower', 1),
    bi('triceps-long', 0.6),
    bi('triceps-lateral', 0.6),
    bi('shoulder-front', 0.4),
  ),
  'chest-pushup': merge(
    bi('chest-lower', 0.9),
    bi('chest-upper', 0.5),
    bi('triceps-long', 0.5),
    bi('triceps-lateral', 0.5),
    bi('shoulder-front', 0.4),
    bi('abs-upper', 0.2),
    bi('abs-lower', 0.2),
  ),
  'chest-cable-crossover': merge(bi('chest-lower', 0.8), bi('chest-upper', 0.8), bi('shoulder-front', 0.25)),
  'chest-machine-press': merge(
    bi('chest-lower', 1),
    bi('chest-upper', 0.4),
    bi('shoulder-front', 0.4),
    bi('triceps-long', 0.4),
    bi('triceps-lateral', 0.4),
  ),
  'chest-pec-deck': merge(bi('chest-lower', 0.9), bi('chest-upper', 0.9), bi('shoulder-front', 0.2)),

  // Dos
  'back-pullup': merge(
    bi('lats-upper', 1),
    bi('lats-mid', 1),
    bi('lats-lower', 0.85),
    bi('biceps', 0.5),
    bi('traps-mid', 0.3),
    bi('traps-lower', 0.3),
    bi('forearm-flexors', 0.3),
  ),
  'back-lat-pulldown': merge(
    bi('lats-upper', 1),
    bi('lats-mid', 1),
    bi('lats-lower', 0.85),
    bi('biceps', 0.5),
    bi('traps-mid', 0.35),
    bi('traps-lower', 0.35),
    bi('deltoid-rear', 0.3),
    bi('forearm-flexors', 0.25),
  ),
  'back-lat-pulldown-life-fitness': merge(
    bi('lats-upper', 1),
    bi('lats-mid', 1),
    bi('lats-lower', 0.85),
    bi('biceps', 0.5),
    bi('traps-mid', 0.35),
    bi('traps-lower', 0.35),
    bi('deltoid-rear', 0.3),
    bi('forearm-flexors', 0.25),
  ),
  'back-barbell-row': merge(
    bi('lats-mid', 0.9),
    bi('lats-lower', 0.7),
    bi('traps-mid', 0.5),
    bi('traps-lower', 0.4),
    bi('deltoid-rear', 0.45),
    bi('biceps', 0.35),
    bi('lower-back-erectors', 0.4),
  ),
  'back-dumbbell-row': merge(
    bi('lats-mid', 0.9),
    bi('lats-lower', 0.7),
    bi('traps-mid', 0.4),
    bi('deltoid-rear', 0.4),
    bi('biceps', 0.35),
  ),
  'back-seated-row': merge(
    bi('lats-mid', 0.85),
    bi('lats-lower', 0.6),
    bi('traps-mid', 0.5),
    bi('traps-lower', 0.4),
    bi('deltoid-rear', 0.4),
    bi('biceps', 0.4),
  ),
  'back-seated-row-life-fitness': merge(
    bi('lats-mid', 0.85),
    bi('lats-lower', 0.6),
    bi('traps-mid', 0.5),
    bi('traps-lower', 0.4),
    bi('deltoid-rear', 0.4),
    bi('biceps', 0.4),
  ),
  'back-deadlift': merge(
    bi('lower-back-erectors', 1),
    bi('gluteus-maximus', 0.8),
    bi('hamstrings-medial', 0.7),
    bi('hamstrings-lateral', 0.7),
    bi('quads', 0.3),
    bi('lats-mid', 0.3),
    bi('traps-upper', 0.3),
    bi('forearm-flexors', 0.3),
  ),
  'back-hyperextension': merge(
    bi('lower-back-erectors', 1),
    bi('gluteus-maximus', 0.5),
    bi('hamstrings-medial', 0.35),
    bi('hamstrings-lateral', 0.35),
  ),
  'back-assisted-pullup': merge(
    bi('lats-upper', 1),
    bi('lats-mid', 0.9),
    bi('lats-lower', 0.7),
    bi('biceps', 0.45),
    bi('traps-mid', 0.25),
  ),

  // Jambes
  'legs-squat': merge(
    bi('quads', 1),
    bi('gluteus-maximus', 0.7),
    bi('adductors', 0.4),
    bi('hamstrings-medial', 0.35),
    bi('hamstrings-lateral', 0.35),
    bi('lower-back-erectors', 0.3),
    bi('abs-upper', 0.2),
    bi('abs-lower', 0.2),
    bi('calves-gastroc-medial', 0.15),
    bi('calves-gastroc-lateral', 0.15),
  ),
  'legs-front-squat': merge(
    bi('quads', 1),
    bi('gluteus-maximus', 0.5),
    bi('abs-upper', 0.3),
    bi('abs-lower', 0.3),
    bi('adductors', 0.3),
    bi('lower-back-erectors', 0.2),
  ),
  'legs-leg-press': merge(
    bi('quads', 1),
    bi('gluteus-maximus', 0.6),
    bi('adductors', 0.3),
    bi('hamstrings-medial', 0.25),
    bi('hamstrings-lateral', 0.25),
  ),
  'legs-lunge': merge(
    bi('quads', 0.9),
    bi('gluteus-maximus', 0.7),
    bi('adductors', 0.35),
    bi('hamstrings-medial', 0.3),
    bi('hamstrings-lateral', 0.3),
    bi('calves-gastroc-medial', 0.2),
    bi('calves-gastroc-lateral', 0.2),
  ),
  'legs-leg-extension': bi('quads', 1),
  'legs-leg-curl': merge(
    bi('hamstrings-medial', 1),
    bi('hamstrings-lateral', 1),
    bi('calves-gastroc-medial', 0.2),
    bi('calves-gastroc-lateral', 0.2),
  ),
  'legs-romanian-deadlift': merge(
    bi('hamstrings-medial', 1),
    bi('hamstrings-lateral', 1),
    bi('gluteus-maximus', 0.7),
    bi('lower-back-erectors', 0.5),
  ),
  'legs-calf-raise': merge(bi('calves-gastroc-medial', 1), bi('calves-gastroc-lateral', 1), bi('calves-soleus', 0.8)),
  'legs-hack-squat': merge(bi('quads', 1), bi('gluteus-maximus', 0.5), bi('adductors', 0.25)),
  'legs-hip-adduction': bi('adductors', 1),
  'legs-hip-abduction': bi('gluteus-medius', 1),
  'legs-hip-thrust': merge(
    bi('gluteus-maximus', 1),
    bi('hamstrings-medial', 0.4),
    bi('hamstrings-lateral', 0.4),
    bi('abs-lower', 0.2),
    bi('abs-upper', 0.2),
  ),
  'legs-hip-thrust-machine': merge(
    bi('gluteus-maximus', 1),
    bi('hamstrings-medial', 0.35),
    bi('hamstrings-lateral', 0.35),
  ),

  // Épaules
  'shoulders-military-press': merge(
    bi('shoulder-front', 1),
    bi('shoulder-side', 0.6),
    bi('triceps-long', 0.4),
    bi('triceps-lateral', 0.4),
    bi('traps-upper', 0.3),
  ),
  'shoulders-dumbbell-press': merge(
    bi('shoulder-front', 1),
    bi('shoulder-side', 0.55),
    bi('triceps-long', 0.4),
    bi('triceps-lateral', 0.4),
  ),
  'shoulders-lateral-raise': merge(bi('shoulder-side', 1), bi('traps-upper', 0.3)),
  'shoulders-front-raise': bi('shoulder-front', 1),
  'shoulders-rear-delt-flye': merge(bi('deltoid-rear', 1), bi('traps-mid', 0.3)),
  'shoulders-rear-delt-flye-life-fitness': merge(bi('deltoid-rear', 1), bi('traps-mid', 0.3)),
  'shoulders-face-pull': merge(bi('deltoid-rear', 0.9), bi('traps-mid', 0.5), bi('traps-lower', 0.4)),
  'shoulders-shrug': bi('traps-upper', 1),
  'shoulders-machine-press': merge(
    bi('shoulder-front', 1),
    bi('shoulder-side', 0.5),
    bi('triceps-long', 0.35),
    bi('triceps-lateral', 0.35),
  ),
  'shoulders-lateral-raise-machine': bi('shoulder-side', 1),
  'shoulders-lateral-raise-machine-life-fitness': bi('shoulder-side', 1),
  'shoulders-lateral-raise-machine-hammer-strength': bi('shoulder-side', 1),
  'shoulders-iso-lateral-press': merge(
    bi('shoulder-front', 1),
    bi('shoulder-side', 0.5),
    bi('triceps-long', 0.35),
    bi('triceps-lateral', 0.35),
  ),

  // Bras
  'arms-barbell-curl': merge(bi('biceps', 1), bi('forearm', 0.4), bi('shoulder-front', 0.15)),
  'arms-dumbbell-curl': merge(bi('biceps', 1), bi('forearm', 0.4), bi('shoulder-front', 0.15)),
  'arms-hammer-curl': merge(bi('biceps', 0.9), bi('forearm', 0.6)),
  'arms-biceps-curl-life-fitness': merge(bi('biceps', 1), bi('forearm', 0.4), bi('shoulder-front', 0.15)),
  'arms-triceps-pushdown': merge(bi('triceps-lateral', 1), bi('triceps-long', 0.8)),
  'arms-triceps-dip': merge(
    bi('triceps-long', 1),
    bi('triceps-lateral', 1),
    bi('chest-lower', 0.3),
    bi('shoulder-front', 0.25),
  ),
  'arms-skullcrusher': merge(bi('triceps-long', 1), bi('triceps-lateral', 0.9)),
  'arms-close-grip-bench': merge(
    bi('triceps-long', 0.9),
    bi('triceps-lateral', 0.9),
    bi('chest-lower', 0.4),
    bi('shoulder-front', 0.3),
  ),
  'arms-preacher-curl': merge(bi('biceps', 1), bi('forearm', 0.3)),
  'arms-triceps-extension-machine': merge(bi('triceps-long', 1), bi('triceps-lateral', 0.9)),
  'arms-triceps-press-life-fitness': merge(bi('triceps-long', 1), bi('triceps-lateral', 0.9)),

  // Abdominaux
  'core-crunch': merge(bi('abs-upper', 1), bi('abs-lower', 0.3)),
  'core-plank': merge(bi('abs-upper', 0.7), bi('abs-lower', 0.7), bi('obliques', 0.4), bi('lower-back-erectors', 0.2)),
  'core-leg-raise': merge(bi('abs-lower', 1), bi('abs-upper', 0.3), bi('hip-flexor', 0.4)),
  'core-russian-twist': merge(bi('obliques', 1), bi('abs-upper', 0.4)),
  'core-ab-wheel': merge(
    bi('abs-upper', 1),
    bi('abs-lower', 0.7),
    bi('obliques', 0.3),
    bi('shoulder-front', 0.2),
    bi('lower-back-erectors', 0.2),
  ),
  'core-cable-crunch': merge(bi('abs-upper', 1), bi('abs-lower', 0.5)),
}

/**
 * Activation cumulée d'une liste d'exercices (ex. les exercices d'un entraînement
 * en cours de composition) : pour chaque muscle, la plus forte intensité parmi les
 * exercices inclus — ajouter un exercice ne peut donc que renforcer ou compléter la
 * carte, jamais l'atténuer.
 */
export function aggregateActivation(exerciseIds: string[]): Activation {
  const result: Activation = {}
  for (const exerciseId of exerciseIds) {
    const activation = EXERCISE_ACTIVATION[exerciseId]
    if (!activation) continue
    for (const [muscleId, intensity] of Object.entries(activation)) {
      result[muscleId] = Math.max(result[muscleId] ?? 0, intensity)
    }
  }
  return result
}
