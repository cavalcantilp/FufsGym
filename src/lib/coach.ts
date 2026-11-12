import type Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL_INFO, createAiClient, type AiModel } from './wizardAi'

/**
 * Coach conversationnel : Claude dispose d'outils qui lisent et modifient l'appli comme le ferait
 * l'utilisateur. La boucle d'outils tourne ici ; l'exécution réelle est fournie par l'écran de chat.
 */

const MAX_ROUNDS = 10
const MAX_TOKENS = 8000

const exerciseItem = {
  type: 'object',
  additionalProperties: false,
  required: ['exerciseId', 'sets', 'reps'],
  properties: {
    exerciseId: { type: 'string', description: "Identifiant d'exercice issu de search_exercises ou get_overview." },
    sets: { type: 'integer', description: 'Nombre de séries (1 pour le cardio).' },
    reps: { type: 'string', description: 'Répétitions visées, texte libre : "8-10", "12", ou "12 min" pour le cardio.' },
    restSec: { type: 'integer', description: 'Repos entre séries, en secondes.' },
  },
} as const

const WEEKDAYS = { type: 'array', items: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] } } as const

const tool = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []): Anthropic.Tool => ({
  name,
  description,
  input_schema: { type: 'object', additionalProperties: false, properties, required },
})

export const COACH_TOOLS: Anthropic.Tool[] = [
  tool('get_overview', "Lit l'état de l'appli : date du jour, entraînements (avec leurs exercices et jours programmés), séance en cours, et dernières séances terminées. À appeler avant de modifier quoi que ce soit, ou pour répondre sur le programme et l'historique."),
  tool(
    'search_exercises',
    "Cherche dans la bibliothèque d'exercices. Renvoie identifiant, nom, groupe musculaire et matériel. Appelle-le pour obtenir les identifiants avant de créer ou modifier un entraînement.",
    {
      query: { type: 'string', description: 'Mots du nom, dans la langue de l\'utilisateur ou en français. Vide pour lister tout un groupe.' },
      muscle: { type: 'string', enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'] },
    },
  ),
  tool('get_exercise_history', "Renvoie les dernières séances d'un exercice (charges en kg et répétitions par série). Utile pour conseiller une charge ou juger une progression.", { exerciseId: { type: 'string' } }, ['exerciseId']),
  tool(
    'create_workout',
    "Crée un entraînement. Avec `weekdays`, il est aussi programmé ces jours-là chaque semaine.",
    { name: { type: 'string' }, exercises: { type: 'array', items: exerciseItem }, weekdays: WEEKDAYS, objective: { type: 'string', description: 'Objectif visé, court. Facultatif.' } },
    ['name', 'exercises'],
  ),
  tool(
    'update_workout',
    "Modifie un entraînement existant. `exercises`, s'il est fourni, remplace la liste complète : renvoie donc tous les exercices à garder, dans l'ordre voulu.",
    { workoutId: { type: 'string' }, name: { type: 'string' }, exercises: { type: 'array', items: exerciseItem } },
    ['workoutId'],
  ),
  tool('delete_workout', "Supprime définitivement un entraînement et sa programmation. L'appli demande elle-même confirmation à l'utilisateur avant d'exécuter.", { workoutId: { type: 'string' } }, ['workoutId']),
  tool(
    'set_schedule',
    "Programme un entraînement sur des jours de la semaine. Une liste vide retire la programmation.",
    { workoutId: { type: 'string' }, weekdays: WEEKDAYS, endDate: { type: 'string', description: 'Date de fin AAAA-MM-JJ. Facultatif.' } },
    ['workoutId', 'weekdays'],
  ),
  tool('start_session', "Démarre la séance du jour, à partir d'un entraînement (`workoutId`) ou libre (sans). Échoue si une séance est déjà en cours.", { workoutId: { type: 'string' } }),
  tool('add_session_exercise', "Ajoute un exercice à la séance en cours.", { exerciseId: { type: 'string' } }, ['exerciseId']),
  tool(
    'log_set',
    "Enregistre une série faite dans la séance en cours : coche la prochaine série non faite de l'exercice, ou en ajoute une. L'exercice est ajouté à la séance s'il n'y est pas.",
    { exerciseId: { type: 'string' }, weightKg: { type: 'number', description: 'Charge en kg (0 au poids du corps).' }, reps: { type: 'integer' } },
    ['exerciseId', 'weightKg', 'reps'],
  ),
  tool('finish_session', "Termine la séance en cours."),
  tool('start_rest_timer', "Lance le minuteur de repos.", { seconds: { type: 'integer' } }, ['seconds']),
  tool('set_day_note', "Écrit la note d'un jour du calendrier (remplace l'existante ; texte vide pour l'effacer).", { date: { type: 'string', description: 'AAAA-MM-JJ' }, text: { type: 'string' } }, ['date', 'text']),
  tool(
    'create_custom_exercise',
    "Crée un exercice personnalisé quand la bibliothèque n'a rien d'équivalent. Renvoie son identifiant.",
    {
      name: { type: 'string' },
      muscle: { type: 'string', enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio'] },
      equipment: { type: 'string', enum: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'] },
    },
    ['name', 'muscle'],
  ),
]

export const coachSystemPrompt = (lang: string, today: string) => `Tu es le coach de musculation intégré à l'appli FufsGym. Tu parles à l'utilisateur de l'appli, sur son téléphone, souvent pendant sa séance.

Ton rôle : conseiller (programme, technique, charges, récupération) et agir dans l'appli à sa place quand il le demande, grâce aux outils. Tu peux créer, modifier et programmer des entraînements, démarrer une séance, enregistrer des séries, lancer le minuteur, écrire une note.

Façon de faire :
- Réponds dans la langue de l'utilisateur (langue de l'appli : ${lang}). Reste bref : quelques phrases, sans titres ni mise en forme Markdown, car le chat affiche du texte brut.
- Avant de modifier quelque chose ou de parler de son programme ou de ses performances, lis l'état réel avec get_overview ou get_exercise_history plutôt que de supposer.
- Les identifiants d'exercices viennent toujours de search_exercises ou get_overview ; ne les invente pas.
- Quand la demande est claire, agis directement puis dis en une phrase ce que tu as fait. Quand elle est ambiguë sur un point qui change le résultat (quel entraînement, quels jours), pose une seule question.
- N'agis que sur ce qui est demandé : un conseil demandé n'est pas une autorisation de modifier le programme.
- Les charges sont en kilogrammes dans les outils.
- Tu n'es pas médecin : pour une douleur persistante ou une blessure, recommande de consulter un professionnel de santé, et propose en attendant des alternatives qui évitent la zone concernée.

Date du jour : ${today}.`

export type CoachToolExecutor = (name: string, input: Record<string, unknown>) => Promise<{ ok: boolean; result: unknown }>

export interface CoachTurnResult {
  /** Historique complet à renvoyer tel quel au tour suivant (blocs de réflexion compris). */
  messages: Anthropic.MessageParam[]
  text: string
  costUsd: number
  stopped: 'done' | 'refusal' | 'truncated' | 'rounds'
}

/** Joue un tour de conversation : appelle Claude, exécute les outils demandés, recommence jusqu'à la réponse finale. */
export async function runCoachTurn(options: {
  apiKey: string
  model: AiModel
  system: string
  history: Anthropic.MessageParam[]
  userText: string
  execute: CoachToolExecutor
  onTool: (name: string, ok: boolean) => void
  signal?: AbortSignal
}): Promise<CoachTurnResult> {
  const { client } = await createAiClient(options.apiKey)
  const info = AI_MODEL_INFO[options.model]
  const messages: Anthropic.MessageParam[] = [...options.history, { role: 'user', content: options.userText }]
  let costUsd = 0
  const texts: string[] = []

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.messages.create(
      {
        model: info.id,
        max_tokens: MAX_TOKENS,
        // Le préfixe (outils + consignes + historique) est identique d'un appel à l'autre : mis en cache.
        cache_control: { type: 'ephemeral' },
        system: options.system,
        tools: COACH_TOOLS,
        messages,
      },
      { signal: options.signal },
    )
    const usage = response.usage
    costUsd +=
      ((usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) * 1.25 + (usage.cache_read_input_tokens ?? 0) * 0.1) / 1_000_000) * info.input +
      (usage.output_tokens / 1_000_000) * info.output

    // Le contenu repart tel quel : les blocs de réflexion doivent rester intacts d'un appel à l'autre.
    messages.push({ role: 'assistant', content: response.content })
    for (const block of response.content) if (block.type === 'text' && block.text.trim()) texts.push(block.text.trim())

    if (response.stop_reason === 'refusal') return { messages, text: texts.join('\n\n'), costUsd, stopped: 'refusal' }
    if (response.stop_reason === 'max_tokens') return { messages, text: texts.join('\n\n'), costUsd, stopped: 'truncated' }
    if (response.stop_reason !== 'tool_use') return { messages, text: texts.join('\n\n'), costUsd, stopped: 'done' }

    const results: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      let outcome: { ok: boolean; result: unknown }
      try {
        outcome = await options.execute(block.name, (block.input ?? {}) as Record<string, unknown>)
      } catch (error) {
        outcome = { ok: false, result: { error: error instanceof Error ? error.message : 'Erreur inconnue' } }
      }
      options.onTool(block.name, outcome.ok)
      results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(outcome.result), ...(outcome.ok ? {} : { is_error: true }) })
    }
    messages.push({ role: 'user', content: results })
  }
  return { messages, text: texts.join('\n\n'), costUsd, stopped: 'rounds' }
}
