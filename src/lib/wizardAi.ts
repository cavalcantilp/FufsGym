import type { Exercise, PlanExercise } from './types'
import { load, save, STORAGE_KEYS } from './storage'
import {
  INJURY_EXCLUDES,
  WEEKDAYS_BY_COUNT,
  WIZARD_TEMPLATES,
  suggestWeight,
  type ProposedWorkout,
  type WizardAnswers,
  type WizardHistory,
  type WizardTemplate,
} from './workoutWizard'

export type AiModel = 'haiku' | 'sonnet' | 'opus'
export const AI_MODELS: AiModel[] = ['haiku', 'sonnet', 'opus']

/**
 * Modèles proposés, du moins cher au plus capable. Tarifs par million de tokens ;
 * `typicalUsd` : ordre de grandeur d'une génération (≈ 5 000 tokens lus, 2 500 écrits).
 */
export const AI_MODEL_INFO: Record<AiModel, { id: string; label: string; input: number; output: number; typicalUsd: number }> = {
  haiku: { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', input: 0.1, output: 0.5, typicalUsd: 0.002 },
  sonnet: { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', input: 2, output: 10, typicalUsd: 0.03 },
  opus: { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', input: 4, output: 20, typicalUsd: 0.07 },
}

export function loadAiModel(): AiModel {
  const model = load<AiModel>(STORAGE_KEYS.aiModel, 'haiku')
  return AI_MODELS.includes(model) ? model : 'haiku'
}

export function saveAiModel(model: AiModel): void {
  save(STORAGE_KEYS.aiModel, model)
}

export class WizardAiError extends Error {}

/** Clé Anthropic personnelle : stockée sur l'appareil seulement, jamais synchronisée avec le compte. */
export function loadAiKey(): { key: string; valid: boolean } {
  const key = load<string>(STORAGE_KEYS.aiKey, '')
  return { key, valid: Boolean(key) && load<boolean>(STORAGE_KEYS.aiKeyValid, false) }
}

export function saveAiKey(key: string, valid: boolean): void {
  save(STORAGE_KEYS.aiKey, key)
  save(STORAGE_KEYS.aiKeyValid, valid)
}

async function createClient(apiKey: string) {
  // Chargé à la demande : le SDK ne pèse sur l'appli que pour qui utilise l'IA.
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  // Appel direct depuis le navigateur : cas prévu pour un usage individuel, où la clé appartient à qui l'envoie.
  return { Anthropic, client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) }
}

/** Vérifie la clé par un appel gratuit (lecture du modèle). `false` = clé refusée ; une panne réseau lève une erreur. */
export async function validateAiKey(apiKey: string): Promise<boolean> {
  const { Anthropic, client } = await createClient(apiKey)
  try {
    await client.models.retrieve(AI_MODEL_INFO.haiku.id)
    return true
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return false
    throw error
  }
}

const SYSTEM = `Tu es un préparateur physique. Tu composes des séances de musculation à partir d'un catalogue fermé d'exercices.

Règles impératives :
- N'utilise que des identifiants présents dans le catalogue fourni, sans doublon dans une même séance.
- Produis exactement le nombre de séances demandé, avec les types de séance demandés quand ils sont imposés.
- Chaque séance doit tenir dans la durée indiquée. Estimation : par exercice, 60 s d'installation + séries × (40 s + repos). Un exercice cardio compte pour sa durée.
- Commence par les polyarticulaires, termine par l'isolation, cardio en dernier.
- Les polyarticulaires de dos et de pectoraux (développés, tirages, rowings) se font en 4 séries ; 3 seulement si la séance déborde autrement.
- Niveau débutant ou reprise : privilégie les machines et les poulies aux poids libres, et inclus le pec deck (chest-pec-deck) dans toute séance qui travaille les pectoraux.
- Les groupes à renforcer reçoivent un exercice ou une série de plus.
- Objectifs : hypertrophie = 8-12 répétitions, repos 75-120 s ; force = 4-6 répétitions sur les polyarticulaires, repos 150-180 s ; perte de gras = 10-15 répétitions, repos 60-75 s, 10-12 min de cardio en fin de séance ; perte de poids = 12-15 répétitions, repos 45-60 s, 10-12 min de cardio en fin de séance.
- Pour le cardio : sets = 1 et reps = "12 min" (durée en minutes).
- Tiens compte de la durée globale du programme et de l'objectif écrit par l'utilisateur pour doser le volume et l'intensité.
- Dans "advice", explique en deux phrases au plus, dans la langue demandée, comment faire évoluer le programme sur cette durée pour atteindre l'objectif (progression des charges, semaines plus légères…). Reste réaliste : si l'objectif est hors de portée sur la durée, dis-le simplement.
- Privilégie les exercices déjà pratiqués par l'utilisateur quand ils conviennent, et répartis le volume de façon équilibrée sur la semaine.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['advice', 'workouts'],
  properties: {
    advice: { type: 'string' },
    workouts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['template', 'exercises'],
        properties: {
          template: { type: 'string', enum: WIZARD_TEMPLATES },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['exerciseId', 'sets', 'reps', 'restSec'],
              properties: {
                exerciseId: { type: 'string' },
                sets: { type: 'integer' },
                reps: { type: 'string' },
                restSec: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  },
}

function buildPrompt(answers: WizardAnswers, history: WizardHistory, catalog: Exercise[], lang: string): string {
  const request =
    answers.mode === 'single'
      ? `1 séance de type "${answers.singleTemplate}"`
      : `un programme de ${answers.sessionsPerWeek} séances par semaine (choisis la répartition la plus adaptée)`
  const practiced = Object.entries(history.usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([id, count]) => `${id} (${count} séances)`)
  const lines = catalog.map((exercise) => `${exercise.id} | ${exercise.name} | ${exercise.muscle} | ${exercise.equipment ?? '-'}`)
  return [
    `Demande : ${request}.`,
    `Types de séance possibles : full (corps entier), upper (haut), lower (bas), push, pull, legs.`,
    `Durée par séance : ${answers.minutes} min.`,
    `Objectif : ${answers.goal}.`,
    `Niveau : ${answers.level === 'beginner' ? 'débutant ou reprise après une longue pause' : 'pratiquant régulier'}.`,
    `Zones sensibles ou blessées : ${answers.injuries.length ? answers.injuries.join(', ') : 'aucune'} (les exercices à risque sont déjà retirés du catalogue).`,
    `Groupes à renforcer : ${answers.focus.length ? answers.focus.join(', ') : 'aucun'}.`,
    `Durée globale du programme : ${answers.durationWeeks} semaine(s).`,
    `Objectif visé sur cette durée, écrit par l'utilisateur : ${answers.target.trim() || 'non précisé'}.`,
    `Langue du champ "advice" : ${lang}.`,
    `Exercices déjà pratiqués : ${practiced.length ? practiced.join(', ') : 'aucun historique'}.`,
    '',
    'Catalogue (identifiant | nom | groupe musculaire | matériel) :',
    ...lines,
  ].join('\n')
}

export interface AiProposal {
  workouts: ProposedWorkout[]
  /** Conseil de progression sur la durée du programme, rédigé par le modèle. */
  advice: string
  /** Coût estimé de la génération, d'après les tokens facturés renvoyés par l'API. */
  costUsd: number
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

/** Revalide la réponse du modèle : identifiants connus, bornes raisonnables, nombre de séances attendu. */
export function parseAiWorkouts(raw: unknown, answers: WizardAnswers, history: WizardHistory, catalog: Exercise[]): ProposedWorkout[] {
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]))
  const list = (raw as { workouts?: unknown })?.workouts
  if (!Array.isArray(list)) throw new WizardAiError('format')
  const expected = answers.mode === 'single' ? 1 : answers.sessionsPerWeek
  if (list.length !== expected) throw new WizardAiError('count')

  const days = answers.mode === 'single' ? [] : (WEEKDAYS_BY_COUNT[expected] ?? [])
  const total: Partial<Record<WizardTemplate, number>> = {}
  const templates = list.map((item) => {
    const value = (item as { template?: string })?.template as WizardTemplate
    const template = answers.mode === 'single' ? answers.singleTemplate : WIZARD_TEMPLATES.includes(value) ? value : 'full'
    total[template] = (total[template] ?? 0) + 1
    return template
  })
  const seen: Partial<Record<WizardTemplate, number>> = {}

  return list.map((item, index) => {
    const template = templates[index]
    const used = new Set<string>()
    const exercises: Omit<PlanExercise, 'id'>[] = []
    for (const entry of ((item as { exercises?: unknown[] })?.exercises ?? []) as Record<string, unknown>[]) {
      const exercise = byId.get(String(entry?.exerciseId))
      if (!exercise || used.has(exercise.id)) continue
      used.add(exercise.id)
      const cardio = exercise.muscle === 'cardio'
      const reps = String(entry.reps ?? '').trim().slice(0, 12) || (cardio ? '12 min' : '10-12')
      const targetWeight = cardio ? undefined : suggestWeight(history.lastSets[exercise.id], reps)
      exercises.push({
        exerciseId: exercise.id,
        sets: cardio ? 1 : clamp(entry.sets, 1, 6, 3),
        reps,
        restSec: clamp(entry.restSec, 30, 240, 90),
        ...(targetWeight ? { targetWeight, targetWeightDate: history.today } : {}),
      })
    }
    if (exercises.length < 3) throw new WizardAiError('empty')
    const rank = seen[template] ?? 0
    seen[template] = rank + 1
    return {
      template,
      ...((total[template] ?? 0) > 1 ? { variant: String.fromCharCode(65 + rank) } : {}),
      exercises,
      weekdays: days[index] !== undefined ? [days[index]] : [],
    }
  })
}

/** Compose la proposition avec Claude. Toute anomalie lève une erreur : l'appelant retombe sur les règles fixes. */
export async function generateWorkoutsWithAi(
  apiKey: string,
  answers: WizardAnswers,
  history: WizardHistory,
  exercises: Exercise[],
  model: AiModel,
  lang: string,
): Promise<AiProposal> {
  const info = AI_MODEL_INFO[model]
  const excluded = new Set(answers.injuries.flatMap((injury) => INJURY_EXCLUDES[injury]))
  const catalog = exercises.filter((exercise) => !excluded.has(exercise.id))
  const { client } = await createClient(apiKey)
  const response = await client.messages.create({
    model: info.id,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: buildPrompt(answers, history, catalog, lang) }],
  })
  if (response.stop_reason !== 'end_turn') throw new WizardAiError(String(response.stop_reason))
  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') throw new WizardAiError('empty')
  let raw: unknown
  try {
    raw = JSON.parse(text.text)
  } catch {
    throw new WizardAiError('json')
  }
  const costUsd =
    (response.usage.input_tokens / 1_000_000) * info.input + (response.usage.output_tokens / 1_000_000) * info.output
  const advice = String((raw as { advice?: unknown })?.advice ?? '').trim().slice(0, 600)
  return { workouts: parseAiWorkouts(raw, answers, history, catalog), advice, costUsd }
}
