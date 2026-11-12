import type { DaySchedule, Equipment, Exercise, MuscleGroup, PlanExercise, Weekday, Workout } from './types'

/**
 * Partage d'un programme par lien : tout le contenu voyage dans le fragment de l'URL
 * (`#share=…`), compressé. Rien n'est stocké sur un serveur, et le fragment n'est
 * jamais envoyé à l'hébergeur de l'appli.
 */

const HASH_PREFIX = '#share='
const PENDING_KEY = 'fg.pendingShare'
const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MAX_WORKOUTS = 26
const MAX_EXERCISES = 40

export interface SharedWorkout {
  name: string
  objective?: string
  weekdays: Weekday[]
  exercises: Omit<PlanExercise, 'id'>[]
}

export interface SharedProgram {
  workouts: SharedWorkout[]
  /** Exercices personnalisés de l'expéditeur utilisés par le programme (leurs identifiants d'origine). */
  customExercises: Exercise[]
}

/** Format compact : [exerciseId, séries, répétitions, repos, enchaîné au suivant]. */
type WireExercise = [string, number, string, number | null, 0 | 1]
interface Wire {
  v: 1
  w: { n: string; o?: string; d: number[]; e: WireExercise[] }[]
  c?: [string, string, string, string | null, 0 | 1][]
}

const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (text: string) => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  // Un flux abîmé fait échouer l'écriture comme la lecture : seule la lecture, attendue ci-dessous, remonte l'erreur.
  writer.write(bytes as BufferSource).catch(() => {})
  writer.close().catch(() => {})
  return new Uint8Array(await new Response(stream.readable).arrayBuffer())
}

/** Construit le lien de partage pour les entraînements donnés (avec leurs jours programmés). */
export async function buildShareUrl(workouts: Workout[], schedules: DaySchedule[], customExercises: Exercise[]): Promise<string> {
  const usedCustom = new Set(workouts.flatMap((workout) => workout.exercises.map((entry) => entry.exerciseId)))
  const wire: Wire = {
    v: 1,
    w: workouts.map((workout) => ({
      n: workout.name,
      ...(workout.objective ? { o: workout.objective } : {}),
      d: (schedules.find((schedule) => schedule.workoutId === workout.id)?.weekdays ?? []).map((day) => WEEKDAYS.indexOf(day)),
      // Les charges visées et les notes restent personnelles : elles ne sont pas partagées.
      e: workout.exercises.map((entry) => [entry.exerciseId, entry.sets, entry.reps, entry.restSec ?? null, entry.linkedToNext ? 1 : 0]),
    })),
  }
  const custom = customExercises.filter((exercise) => usedCustom.has(exercise.id))
  if (custom.length) {
    wire.c = custom.map((exercise) => [exercise.id, exercise.name, exercise.muscle, exercise.equipment ?? null, exercise.trackingType === 'duration' ? 1 : 0])
  }
  const json = new TextEncoder().encode(JSON.stringify(wire))
  let token: string
  try {
    token = `z.${toBase64Url(await pipe(json, new CompressionStream('deflate-raw')))}`
  } catch {
    // Navigateur sans compression : le lien est plus long mais reste lisible par tous.
    token = `j.${toBase64Url(json)}`
  }
  return `${window.location.origin}${window.location.pathname}${HASH_PREFIX}${token}`
}

/** Décode et valide un jeton de partage. `null` si le lien est abîmé ou d'un format inconnu. */
export async function decodeShare(token: string): Promise<SharedProgram | null> {
  try {
    const [kind, data] = [token.slice(0, 2), token.slice(2)]
    const bytes = kind === 'z.' ? await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw')) : kind === 'j.' ? fromBase64Url(data) : null
    if (!bytes) return null
    const wire = JSON.parse(new TextDecoder().decode(bytes)) as Wire
    if (wire?.v !== 1 || !Array.isArray(wire.w) || wire.w.length === 0) return null

    const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)
    const workouts: SharedWorkout[] = wire.w.slice(0, MAX_WORKOUTS).map((item) => {
      const exercises = (Array.isArray(item.e) ? item.e : []).slice(0, MAX_EXERCISES).flatMap((entry) => {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !entry[0]) return []
        const sets = Math.round(Number(entry[1]))
        const rest = Number(entry[3])
        return [
          {
            exerciseId: entry[0].slice(0, 80),
            sets: Number.isFinite(sets) ? Math.min(20, Math.max(1, sets)) : 3,
            reps: text(entry[2], 20) || '10',
            ...(entry[3] !== null && Number.isFinite(rest) ? { restSec: Math.min(900, Math.max(0, Math.round(rest))) } : {}),
            ...(entry[4] ? { linkedToNext: true } : {}),
          },
        ]
      })
      const objective = text(item.o, 300)
      return {
        name: text(item.n, 60),
        ...(objective ? { objective } : {}),
        weekdays: [...new Set((Array.isArray(item.d) ? item.d : []).map((index) => WEEKDAYS[index]).filter(Boolean))],
        exercises,
      }
    })
    const valid = workouts.filter((workout) => workout.name && workout.exercises.length > 0)
    if (valid.length === 0) return null

    const customExercises: Exercise[] = (Array.isArray(wire.c) ? wire.c : []).slice(0, 200).flatMap((entry) => {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !text(entry[1], 80)) return []
      return [
        {
          id: entry[0].slice(0, 80),
          name: text(entry[1], 80),
          muscle: text(entry[2], 20) as MuscleGroup,
          ...(entry[3] ? { equipment: text(entry[3], 20) as Equipment } : {}),
          ...(entry[4] ? { trackingType: 'duration' as const } : {}),
          custom: true,
        },
      ]
    })
    return { workouts: valid, customExercises }
  } catch {
    return null
  }
}

/**
 * Retire le jeton de l'URL et le met de côté pour l'onglet : il survit ainsi à l'écran
 * de connexion (y compris l'aller-retour Google) avant d'arriver à l'écran d'acceptation.
 */
export function capturePendingShare(): void {
  try {
    if (!window.location.hash.startsWith(HASH_PREFIX)) return
    sessionStorage.setItem(PENDING_KEY, window.location.hash.slice(HASH_PREFIX.length))
    history.replaceState(null, '', window.location.pathname + window.location.search)
  } catch {
    // Stockage indisponible : le lien est simplement ignoré.
  }
}

export function readPendingShare(): string | null {
  try {
    return sessionStorage.getItem(PENDING_KEY)
  } catch {
    return null
  }
}

export function clearPendingShare(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    // Rien à faire.
  }
}

capturePendingShare()
