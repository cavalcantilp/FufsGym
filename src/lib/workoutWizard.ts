import type { MuscleGroup, PlanExercise, Weekday } from './types'

/**
 * Générateur d'entraînements de l'assistant : règles simples, sans réseau.
 * À partir des réponses (fréquence, durée, objectif, zones sensibles, groupes à
 * renforcer), choisit une répartition hebdomadaire puis remplit chaque séance
 * à partir de « créneaux » de mouvement, chacun avec ses exercices candidats.
 */

export type WizardMode = 'single' | 'program'
export type WizardGoal = 'weightLoss' | 'fatLoss' | 'hypertrophy' | 'strength'
export type WizardInjury = 'shoulders' | 'lowerBack' | 'knees' | 'elbows' | 'hips'
export type WizardTemplate = 'full' | 'upper' | 'lower' | 'push' | 'pull' | 'legs'
export type FocusGroup = Exclude<MuscleGroup, 'cardio'>

export interface WizardAnswers {
  mode: WizardMode
  /** Séances par semaine (mode programme). */
  sessionsPerWeek: number
  /** Type de séance (mode entraînement unique). */
  singleTemplate: WizardTemplate
  minutes: number
  goal: WizardGoal
  injuries: WizardInjury[]
  focus: FocusGroup[]
}

export interface ProposedWorkout {
  template: WizardTemplate
  /** Lettre de variante (A, B…) quand le même type de séance revient plusieurs fois dans la semaine. */
  variant?: string
  exercises: Omit<PlanExercise, 'id'>[]
  weekdays: Weekday[]
}

export const WIZARD_MINUTES = [30, 45, 60, 75, 90]
export const WIZARD_GOALS: WizardGoal[] = ['hypertrophy', 'fatLoss', 'weightLoss', 'strength']
export const WIZARD_INJURIES: WizardInjury[] = ['shoulders', 'lowerBack', 'knees', 'elbows', 'hips']
export const WIZARD_FOCUS: FocusGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']
export const WIZARD_TEMPLATES: WizardTemplate[] = ['full', 'upper', 'lower', 'push', 'pull', 'legs']

interface Slot {
  group: MuscleGroup
  compound: boolean
  /** Exercices candidats, du plus courant au moins courant. */
  ids: string[]
}

const SLOTS = {
  chestPress: { group: 'chest', compound: true, ids: ['chest-bench-press', 'chest-dumbbell-press', 'chest-machine-press', 'chest-pushup'] },
  chestIncline: { group: 'chest', compound: true, ids: ['chest-incline-dumbbell-press', 'chest-incline-bench', 'chest-smith-incline-press', 'chest-iso-lateral-incline-press'] },
  chestFly: { group: 'chest', compound: false, ids: ['chest-cable-crossover', 'chest-pec-deck', 'chest-flye'] },
  vertPull: { group: 'back', compound: true, ids: ['back-lat-pulldown', 'back-pullup', 'back-assisted-pullup', 'back-iso-lateral-high-row'] },
  horizPull: { group: 'back', compound: true, ids: ['back-seated-row', 'back-dumbbell-row', 'back-barbell-row', 'back-iso-lateral-low-row'] },
  hinge: { group: 'legs', compound: true, ids: ['legs-romanian-deadlift', 'back-deadlift', 'legs-hip-thrust-machine', 'back-hyperextension'] },
  squat: { group: 'legs', compound: true, ids: ['legs-squat', 'legs-leg-press', 'legs-hack-squat', 'legs-front-squat'] },
  legSingle: { group: 'legs', compound: true, ids: ['legs-lunge', 'legs-leg-press', 'legs-iso-lateral-leg-press'] },
  quadIso: { group: 'legs', compound: false, ids: ['legs-leg-extension'] },
  hamIso: { group: 'legs', compound: false, ids: ['legs-leg-curl', 'legs-iso-lateral-leg-curl'] },
  glute: { group: 'legs', compound: false, ids: ['legs-hip-thrust', 'legs-hip-thrust-machine', 'legs-hip-abduction'] },
  calves: { group: 'legs', compound: false, ids: ['legs-calf-raise'] },
  shoulderPress: { group: 'shoulders', compound: true, ids: ['shoulders-dumbbell-press', 'shoulders-military-press', 'shoulders-machine-press', 'shoulders-arnold-press'] },
  lateral: { group: 'shoulders', compound: false, ids: ['shoulders-lateral-raise', 'shoulders-cable-lateral-raise', 'shoulders-lateral-raise-machine'] },
  rearDelt: { group: 'shoulders', compound: false, ids: ['shoulders-face-pull', 'shoulders-rear-delt-flye'] },
  biceps: { group: 'arms', compound: false, ids: ['arms-dumbbell-curl', 'arms-barbell-curl', 'arms-cable-curl'] },
  biceps2: { group: 'arms', compound: false, ids: ['arms-hammer-curl', 'arms-preacher-curl', 'arms-cable-curl'] },
  triceps: { group: 'arms', compound: false, ids: ['arms-triceps-pushdown', 'arms-triceps-extension-machine', 'arms-skullcrusher'] },
  triceps2: { group: 'arms', compound: false, ids: ['arms-skullcrusher', 'arms-triceps-extension-machine', 'arms-triceps-dip'] },
  core: { group: 'core', compound: false, ids: ['core-cable-crunch', 'core-leg-raise', 'core-crunch'] },
  core2: { group: 'core', compound: false, ids: ['core-leg-raise', 'core-russian-twist', 'core-crunch'] },
  cardio: { group: 'cardio', compound: false, ids: ['cardio-treadmill-walk', 'cardio-cycling', 'cardio-elliptical', 'cardio-rowing'] },
} satisfies Record<string, Slot>

type SlotKey = keyof typeof SLOTS

/** Créneaux de chaque type de séance, par ordre de priorité (les premiers survivent quand le temps manque). */
const TEMPLATE_SLOTS: Record<WizardTemplate, SlotKey[]> = {
  full: ['squat', 'chestPress', 'horizPull', 'hinge', 'shoulderPress', 'vertPull', 'core', 'biceps', 'triceps', 'calves'],
  upper: ['chestPress', 'horizPull', 'shoulderPress', 'vertPull', 'chestIncline', 'lateral', 'biceps', 'triceps', 'rearDelt'],
  lower: ['squat', 'hinge', 'legSingle', 'hamIso', 'quadIso', 'calves', 'glute', 'core'],
  push: ['chestPress', 'shoulderPress', 'chestIncline', 'lateral', 'triceps', 'chestFly', 'triceps2'],
  pull: ['vertPull', 'horizPull', 'rearDelt', 'biceps', 'hinge', 'biceps2', 'core'],
  legs: ['squat', 'hinge', 'legSingle', 'hamIso', 'quadIso', 'calves', 'glute', 'core'],
}

/** Créneau ajouté quand un groupe est à renforcer et que la séance le travaille déjà (ou est un full body). */
const FOCUS_EXTRA: Record<FocusGroup, SlotKey> = {
  chest: 'chestFly',
  back: 'horizPull',
  legs: 'legSingle',
  shoulders: 'lateral',
  arms: 'biceps2',
  core: 'core2',
}

/** Exercices à écarter selon la zone sensible : ceux qui la chargent le plus directement. */
const INJURY_EXCLUDES: Record<WizardInjury, string[]> = {
  shoulders: [
    'chest-bench-press', 'chest-incline-bench', 'chest-dips', 'back-pullup', 'arms-triceps-dip',
    'shoulders-military-press', 'shoulders-arnold-press', 'shoulders-dumbbell-press', 'shoulders-machine-press', 'shoulders-upright-row',
  ],
  lowerBack: [
    'back-deadlift', 'legs-romanian-deadlift', 'back-barbell-row', 'back-hyperextension', 'legs-squat', 'legs-front-squat',
    'shoulders-military-press', 'core-russian-twist',
  ],
  knees: ['legs-squat', 'legs-front-squat', 'legs-lunge', 'legs-hack-squat', 'legs-leg-extension', 'cardio-running', 'cardio-jump-rope'],
  elbows: ['arms-skullcrusher', 'arms-close-grip-bench', 'arms-triceps-dip', 'chest-dips', 'arms-barbell-curl', 'back-pullup'],
  hips: ['legs-squat', 'legs-front-squat', 'legs-lunge', 'legs-hip-thrust', 'back-deadlift', 'legs-romanian-deadlift'],
}

interface GoalParams {
  compound: { sets: number; reps: string; restSec: number }
  isolation: { sets: number; reps: string; restSec: number }
  /** Termine la séance par du cardio (objectifs de perte). */
  cardioFinisher: boolean
}

const GOAL_PARAMS: Record<WizardGoal, GoalParams> = {
  hypertrophy: { compound: { sets: 4, reps: '8-10', restSec: 120 }, isolation: { sets: 3, reps: '10-12', restSec: 75 }, cardioFinisher: false },
  strength: { compound: { sets: 4, reps: '4-6', restSec: 180 }, isolation: { sets: 3, reps: '8-10', restSec: 90 }, cardioFinisher: false },
  fatLoss: { compound: { sets: 3, reps: '10-12', restSec: 75 }, isolation: { sets: 3, reps: '12-15', restSec: 60 }, cardioFinisher: true },
  weightLoss: { compound: { sets: 3, reps: '12-15', restSec: 60 }, isolation: { sets: 2, reps: '15', restSec: 45 }, cardioFinisher: true },
}

const CARDIO_MINUTES = 12
/** Durée approximative d'une série (exécution) et de la mise en place d'un exercice, en secondes. */
const WORK_SEC = 40
const SETUP_SEC = 60

const WEEKDAYS_BY_COUNT: Record<number, Weekday[]> = {
  1: ['mon'],
  2: ['mon', 'thu'],
  3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'thu', 'fri'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
}

/** Répartition hebdomadaire : quel type de séance pour chaque jour d'entraînement. */
function splitFor(sessions: number, goal: WizardGoal): WizardTemplate[] {
  const loss = goal === 'weightLoss' || goal === 'fatLoss'
  switch (sessions) {
    case 2:
      return ['full', 'full']
    case 3:
      return loss ? ['full', 'full', 'full'] : ['push', 'pull', 'legs']
    case 4:
      return ['upper', 'lower', 'upper', 'lower']
    case 5:
      return ['push', 'pull', 'legs', 'upper', 'lower']
    case 6:
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs']
    default:
      return ['full']
  }
}

/** Durée estimée d'une séance, en minutes. */
export function estimateMinutes(exercises: Omit<PlanExercise, 'id'>[]): number {
  const seconds = exercises.reduce((total, entry) => {
    if (entry.exerciseId.startsWith('cardio-')) return total + (parseInt(entry.reps, 10) || CARDIO_MINUTES) * 60
    return total + SETUP_SEC + entry.sets * (WORK_SEC + (entry.restSec ?? 90))
  }, 0)
  return Math.round(seconds / 60)
}

function buildWorkout(template: WizardTemplate, variantIndex: number, answers: WizardAnswers): Omit<PlanExercise, 'id'>[] {
  const params = GOAL_PARAMS[answers.goal]
  const excluded = new Set(answers.injuries.flatMap((injury) => INJURY_EXCLUDES[injury]))
  const focus = new Set<MuscleGroup>(answers.focus)

  const slots: SlotKey[] = [...TEMPLATE_SLOTS[template]]
  for (const group of answers.focus) {
    const extra = FOCUS_EXTRA[group]
    const relevant = template === 'full' || slots.some((key) => SLOTS[key].group === group)
    if (relevant && !slots.includes(extra)) slots.push(extra)
  }

  // Priorité : les trois mouvements de base du modèle, puis les groupes à renforcer, puis le reste.
  const rank = (key: SlotKey, index: number) => (index < 3 ? 0 : focus.has(SLOTS[key].group) ? 1 : 2)
  const prioritized = slots
    .map((key, index) => ({ key, index }))
    .sort((a, b) => rank(a.key, a.index) - rank(b.key, b.index) || a.index - b.index)

  const used = new Set<string>()
  const picked: { key: SlotKey; index: number; entry: Omit<PlanExercise, 'id'> }[] = []
  for (const { key, index } of prioritized) {
    const slot: Slot = SLOTS[key]
    // La variante décale le premier choix pour que deux séances du même type ne soient pas identiques.
    const candidates = slot.ids.map((_, i) => slot.ids[(i + variantIndex) % slot.ids.length])
    const exerciseId = candidates.find((id) => !excluded.has(id) && !used.has(id))
    if (!exerciseId) continue
    used.add(exerciseId)
    const base = slot.compound ? params.compound : params.isolation
    picked.push({
      key,
      index,
      entry: { exerciseId, sets: base.sets + (focus.has(slot.group) ? 1 : 0), reps: base.reps, restSec: base.restSec },
    })
  }

  const cardio: Omit<PlanExercise, 'id'>[] = []
  if (params.cardioFinisher) {
    const slot: Slot = SLOTS.cardio
    const exerciseId = slot.ids.map((_, i) => slot.ids[(i + variantIndex) % slot.ids.length]).find((id) => !excluded.has(id))
    if (exerciseId) cardio.push({ exerciseId, sets: 1, reps: `${CARDIO_MINUTES} min`, restSec: 60 })
  }

  // On retire les créneaux les moins prioritaires tant que la séance dépasse la durée voulue.
  const kept = [...picked]
  while (kept.length > 3 && estimateMinutes([...kept.map((p) => p.entry), ...cardio]) > answers.minutes) kept.pop()
  // Encore trop long avec trois exercices (séance courte, longs repos) : on retire une série partout.
  while (estimateMinutes([...kept.map((p) => p.entry), ...cardio]) > answers.minutes && kept.some((p) => p.entry.sets > 2)) {
    for (const p of kept) if (p.entry.sets > 2) p.entry.sets -= 1
  }

  // Ordre d'exécution : polyarticulaires d'abord, puis isolation, cardio en dernier.
  kept.sort((a, b) => Number(SLOTS[b.key].compound) - Number(SLOTS[a.key].compound) || a.index - b.index)
  return [...kept.map((p) => p.entry), ...cardio]
}

/** Construit la proposition complète : une séance, ou autant que de jours d'entraînement par semaine. */
export function generateWorkouts(answers: WizardAnswers): ProposedWorkout[] {
  if (answers.mode === 'single') {
    return [{ template: answers.singleTemplate, exercises: buildWorkout(answers.singleTemplate, 0, answers), weekdays: [] }]
  }
  const split = splitFor(answers.sessionsPerWeek, answers.goal)
  const days = WEEKDAYS_BY_COUNT[split.length] ?? []
  const seen: Partial<Record<WizardTemplate, number>> = {}
  return split.map((template, index) => {
    const variantIndex = seen[template] ?? 0
    seen[template] = variantIndex + 1
    const repeated = split.filter((entry) => entry === template).length > 1
    return {
      template,
      variant: repeated ? String.fromCharCode(65 + variantIndex) : undefined,
      exercises: buildWorkout(template, variantIndex, answers),
      weekdays: days[index] ? [days[index]] : [],
    }
  })
}
