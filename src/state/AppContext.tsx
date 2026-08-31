import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { BUILTIN_EXERCISES } from '../lib/exercises'
import { load, save, clearAll, STORAGE_KEYS } from '../lib/storage'
import { nextFreeLetter } from '../lib/schedule'
import { moveGroup } from '../lib/superset'
import { todayKey } from '../lib/date'
import { DEFAULT_REST_SEC } from '../lib/rest'
import { detectLang, TRANSLATIONS, type TranslationKey } from '../i18n/translations'
import type {
  DaySchedule,
  Exercise,
  Lang,
  PlanExercise,
  Session,
  SessionExercise,
  SetLog,
  Units,
  Workout,
} from '../lib/types'

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const DEFAULT_UNITS: Units = { weight: 'kg', length: 'cm' }

/** Champs de valeur d'une série (hors `done`) : modifier l'un d'eux répercute la même valeur sur les séries suivantes non encore validées. */
const CASCADE_SET_KEYS = ['weight', 'reps', 'durationSec', 'durationMin', 'distanceKm'] as const satisfies readonly (keyof SetLog)[]

interface AppState {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string

  units: Units
  updateUnits: (patch: Partial<Units>) => void

  onboarded: boolean
  completeOnboarding: () => void

  exercises: Exercise[]
  customExercises: Exercise[]
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'custom'>) => Exercise
  removeCustomExercise: (id: string) => void
  /** Exercices favoris (par id), affichés en tête de liste dans le sélecteur d'exercice. */
  favoriteExerciseIds: string[]
  toggleFavoriteExercise: (id: string) => void
  exerciseById: (id: string) => Exercise | undefined

  workouts: Workout[]
  addWorkout: (name: string) => Workout
  renameWorkout: (id: string, name: string) => void
  removeWorkout: (id: string) => void
  addExercise: (workoutId: string, entry: Omit<PlanExercise, 'id'>) => PlanExercise
  /** Remplace intégralement les exercices d'un entraînement existant, en conservant son id (et donc sa programmation). */
  replaceWorkoutExercises: (workoutId: string, exercises: Omit<PlanExercise, 'id'>[]) => void
  updateExercise: (workoutId: string, entryId: string, patch: Partial<PlanExercise>) => void
  removeExercise: (workoutId: string, entryId: string) => void
  setSupersetLink: (workoutId: string, exerciseId: string, linked: boolean) => void
  moveExercise: (workoutId: string, entryId: string, direction: 'up' | 'down') => void

  schedules: DaySchedule[]
  scheduleForWorkout: (workoutId: string) => DaySchedule | undefined
  /** Crée la programmation d'un entraînement avec la prochaine lettre libre ; `null` si les dix sont déjà prises. */
  addSchedule: (workoutId: string) => DaySchedule | null
  updateSchedule: (id: string, patch: Partial<Pick<DaySchedule, 'weekdays' | 'startDate' | 'endDate'>>) => void
  removeSchedule: (id: string) => void

  /** Notes libres par jour (clé YYYY-MM-DD), indépendantes de toute séance. */
  dayNotes: Record<string, string>
  /** Une chaîne vide efface la note du jour. */
  setDayNote: (date: string, text: string) => void

  /** Historique des notes par exercice (clé exerciseId, puis clé date YYYY-MM-DD). */
  exerciseNotes: Record<string, Record<string, string>>
  /** Une chaîne vide efface la note de ce jour pour cet exercice. */
  setExerciseNote: (exerciseId: string, date: string, text: string) => void

  sessions: Session[]
  sessionsFor: (date: string) => Session[]
  startSession: (date: string, workout?: Workout | null) => Session
  addSessionExercise: (sessionId: string, exerciseId: string) => void
  removeSessionExercise: (sessionId: string, sessionExerciseId: string) => void
  moveSessionExercise: (sessionId: string, sessionExerciseId: string, direction: 'up' | 'down') => void
  addSet: (sessionId: string, sessionExerciseId: string, set?: Partial<SetLog>) => void
  updateSet: (sessionId: string, sessionExerciseId: string, setId: string, patch: Partial<SetLog>) => void
  removeSet: (sessionId: string, sessionExerciseId: string, setId: string) => void
  updateSessionExerciseRest: (sessionId: string, sessionExerciseId: string, restSec: number) => void
  updateSessionExerciseCardioUnit: (sessionId: string, sessionExerciseId: string, unit: 'min' | 'km') => void
  finishSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  renameSession: (sessionId: string, name: string) => void
  lastPerformance: (exerciseId: string, beforeDate: string) => SetLog[] | null

  resetAll: () => void
  /** Déclenche le téléchargement d'un fichier JSON contenant toutes les données de l'appli. */
  exportData: () => void
  /** Remplace toutes les données par celles d'un export ; renvoie `false` si le contenu est invalide. */
  importData: (data: unknown) => boolean

  /**
   * Minuteur de repos global : vit au niveau de l'appli (pas d'un écran) pour
   * survivre à un changement d'onglet. Réduit en bandeau plutôt que fermé, il
   * continue de décompter jusqu'à son terme.
   */
  activeRestTimer: ActiveRestTimer | null
  startRestTimer: (seconds: number, options?: { label?: string; skipLabel?: string }) => void
  extendRestTimer: (deltaMs: number) => void
  minimizeRestTimer: () => void
  restoreRestTimer: () => void
  stopRestTimer: () => void
}

export interface ActiveRestTimer {
  key: number
  totalMs: number
  startedAt: number
  label?: string
  skipLabel?: string
  minimized: boolean
}

interface AppExportData {
  version: 1
  exportedAt: string
  lang: Lang
  units: Units
  customExercises: Exercise[]
  favoriteExerciseIds: string[]
  workouts: Workout[]
  schedules: DaySchedule[]
  sessions: Session[]
  dayNotes: Record<string, string>
  exerciseNotes: Record<string, Record<string, string>>
}

function isAppExportData(value: unknown): value is AppExportData {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.lang === 'string' &&
    typeof v.units === 'object' &&
    v.units !== null &&
    Array.isArray(v.customExercises) &&
    Array.isArray(v.favoriteExerciseIds) &&
    Array.isArray(v.workouts) &&
    Array.isArray(v.schedules) &&
    Array.isArray(v.sessions) &&
    typeof v.dayNotes === 'object' &&
    v.dayNotes !== null
    // exerciseNotes est absent des exports antérieurs à son ajout : pas de vérification stricte, valeur par défaut à l'import.
  )
}

/**
 * Migre l'ancien format (une note unique par exercice, sans date) vers le
 * nouveau (une note par exercice et par jour) : les notes existantes sont
 * rattachées à aujourd'hui plutôt que perdues.
 */
function migrateExerciseNotes(raw: unknown): Record<string, Record<string, string>> {
  if (!raw || typeof raw !== 'object') return {}
  const result: Record<string, Record<string, string>> = {}
  for (const [exerciseId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[exerciseId] = { [todayKey()]: value }
    } else if (value && typeof value === 'object') {
      result[exerciseId] = value as Record<string, string>
    }
  }
  return result
}

const AppContext = createContext<AppState | null>(null)

const emptySet = (): SetLog => ({ id: newId(), weight: 0, reps: 0, done: false })

/**
 * Dernière série réellement validée (poids ou reps > 0) pour un exercice, tous
 * entraînements confondus (peu importe la séance ou l'entraînement d'où elle
 * provient) — sert de valeur de départ pour la prochaine série de cet exercice.
 */
function findLastSet(allSessions: Session[], exerciseId: string): SetLog | null {
  const candidates = [...allSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  for (const session of candidates) {
    const match = session.exercises.find((e) => e.exerciseId === exerciseId)
    if (!match) continue
    const done = match.sets.filter((set) => set.done && (set.weight > 0 || set.reps > 0))
    if (done.length) return done[done.length - 1]
  }
  return null
}

/** Reprend poids/reps d'une série précédente pour préremplir une nouvelle série ; vide si aucune référence. */
function carryOverValues(last: SetLog | null): Pick<SetLog, 'weight' | 'reps'> | Record<string, never> {
  return last ? { weight: last.weight, reps: last.reps } : {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => load(STORAGE_KEYS.lang, detectLang()))
  const [units, setUnits] = useState<Units>(() => ({ ...DEFAULT_UNITS, ...load(STORAGE_KEYS.units, {} as Partial<Units>) }))
  const [onboarded, setOnboarded] = useState<boolean>(() => load(STORAGE_KEYS.onboarded, false))
  const [customExercises, setCustomExercises] = useState<Exercise[]>(() =>
    load(STORAGE_KEYS.customExercises, []),
  )
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>(() =>
    load(STORAGE_KEYS.favoriteExercises, []),
  )
  const [workouts, setWorkouts] = useState<Workout[]>(() => load(STORAGE_KEYS.workouts, []))
  const [schedules, setSchedules] = useState<DaySchedule[]>(() => load(STORAGE_KEYS.schedules, []))
  const [sessions, setSessions] = useState<Session[]>(() => load(STORAGE_KEYS.sessions, []))
  const [dayNotes, setDayNotes] = useState<Record<string, string>>(() => load(STORAGE_KEYS.dayNotes, {}))
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, Record<string, string>>>(() =>
    migrateExerciseNotes(load(STORAGE_KEYS.exerciseNotes, {})),
  )
  const [activeRestTimer, setActiveRestTimer] = useState<ActiveRestTimer | null>(null)
  const restTimerKeyRef = useRef(0)

  useEffect(() => {
    setSchedules((current) => {
      const validIds = new Set(workouts.map((w) => w.id))
      const filtered = current.filter((s) => validIds.has(s.workoutId))
      return filtered.length === current.length ? current : filtered
    })
  }, [workouts])

  useEffect(() => save(STORAGE_KEYS.lang, lang), [lang])
  useEffect(() => save(STORAGE_KEYS.units, units), [units])
  useEffect(() => save(STORAGE_KEYS.onboarded, onboarded), [onboarded])
  useEffect(() => save(STORAGE_KEYS.customExercises, customExercises), [customExercises])
  useEffect(() => save(STORAGE_KEYS.favoriteExercises, favoriteExerciseIds), [favoriteExerciseIds])
  useEffect(() => save(STORAGE_KEYS.workouts, workouts), [workouts])
  useEffect(() => save(STORAGE_KEYS.schedules, schedules), [schedules])
  useEffect(() => save(STORAGE_KEYS.sessions, sessions), [sessions])
  useEffect(() => save(STORAGE_KEYS.dayNotes, dayNotes), [dayNotes])
  useEffect(() => save(STORAGE_KEYS.exerciseNotes, exerciseNotes), [exerciseNotes])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const template = TRANSLATIONS[lang][key] ?? TRANSLATIONS.fr[key] ?? key
      if (!vars) return template
      return Object.entries(vars).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        template,
      )
    },
    [lang],
  )

  const updateUnits = useCallback((patch: Partial<Units>) => {
    setUnits((current) => ({ ...current, ...patch }))
  }, [])

  const exercises = useMemo(() => [...customExercises, ...BUILTIN_EXERCISES], [customExercises])
  const exerciseById = useCallback((id: string) => exercises.find((e) => e.id === id), [exercises])

  const addCustomExercise = useCallback((exercise: Omit<Exercise, 'id' | 'custom'>) => {
    const created: Exercise = { ...exercise, id: `custom-${newId()}`, custom: true }
    setCustomExercises((current) => [created, ...current])
    return created
  }, [])

  const removeCustomExercise = useCallback((id: string) => {
    setCustomExercises((current) => current.filter((e) => e.id !== id))
  }, [])

  const toggleFavoriteExercise = useCallback((id: string) => {
    setFavoriteExerciseIds((current) =>
      current.includes(id) ? current.filter((favId) => favId !== id) : [...current, id],
    )
  }, [])

  const addWorkout = useCallback((name: string) => {
    const workout: Workout = { id: newId(), name, exercises: [], createdAt: new Date().toISOString() }
    setWorkouts((current) => [...current, workout])
    return workout
  }, [])

  const renameWorkout = useCallback((id: string, name: string) => {
    setWorkouts((current) => current.map((w) => (w.id === id ? { ...w, name } : w)))
  }, [])

  const removeWorkout = useCallback((id: string) => {
    setWorkouts((current) => current.filter((w) => w.id !== id))
    setSchedules((current) => current.filter((s) => s.workoutId !== id))
  }, [])

  const addExercise = useCallback((workoutId: string, entry: Omit<PlanExercise, 'id'>) => {
    const created: PlanExercise = { ...entry, id: newId() }
    setWorkouts((current) =>
      current.map((w) => (w.id !== workoutId ? w : { ...w, exercises: [...w.exercises, created] })),
    )
    return created
  }, [])

  const updateExercise = useCallback(
    (workoutId: string, entryId: string, patch: Partial<PlanExercise>) => {
      setWorkouts((current) =>
        current.map((w) =>
          w.id !== workoutId
            ? w
            : { ...w, exercises: w.exercises.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) },
        ),
      )
    },
    [],
  )

  const replaceWorkoutExercises = useCallback((workoutId: string, exercises: Omit<PlanExercise, 'id'>[]) => {
    setWorkouts((current) =>
      current.map((w) =>
        w.id !== workoutId ? w : { ...w, exercises: exercises.map((entry) => ({ ...entry, id: newId() })) },
      ),
    )
  }, [])

  const removeExercise = useCallback((workoutId: string, entryId: string) => {
    setWorkouts((current) =>
      current.map((w) => {
        if (w.id !== workoutId) return w
        const idx = w.exercises.findIndex((e) => e.id === entryId)
        if (idx === -1) return w
        const exercises = w.exercises
          .filter((e) => e.id !== entryId)
          .map((e, i) => (idx > 0 && i === idx - 1 ? { ...e, linkedToNext: false } : e))
        return { ...w, exercises }
      }),
    )
  }, [])

  const setSupersetLink = useCallback((workoutId: string, exerciseId: string, linked: boolean) => {
    setWorkouts((current) =>
      current.map((w) =>
        w.id !== workoutId
          ? w
          : { ...w, exercises: w.exercises.map((e) => (e.id === exerciseId ? { ...e, linkedToNext: linked } : e)) },
      ),
    )
  }, [])

  const moveExercise = useCallback((workoutId: string, entryId: string, direction: 'up' | 'down') => {
    setWorkouts((current) =>
      current.map((w) => (w.id !== workoutId ? w : { ...w, exercises: moveGroup(w.exercises, entryId, direction) })),
    )
  }, [])

  const scheduleForWorkout = useCallback(
    (workoutId: string) => schedules.find((s) => s.workoutId === workoutId),
    [schedules],
  )

  const addSchedule = useCallback(
    (workoutId: string) => {
      const letter = nextFreeLetter(schedules)
      if (!letter) return null
      const created: DaySchedule = { id: newId(), workoutId, letter, weekdays: [], createdAt: todayKey() }
      setSchedules((current) => [...current, created])
      return created
    },
    [schedules],
  )

  const updateSchedule = useCallback(
    (id: string, patch: Partial<Pick<DaySchedule, 'weekdays' | 'startDate' | 'endDate'>>) => {
      setSchedules((current) => current.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    },
    [],
  )

  const removeSchedule = useCallback((id: string) => {
    setSchedules((current) => current.filter((s) => s.id !== id))
  }, [])

  const setDayNote = useCallback((date: string, text: string) => {
    setDayNotes((current) => {
      if (!text) {
        if (!(date in current)) return current
        const { [date]: _removed, ...rest } = current
        return rest
      }
      return { ...current, [date]: text }
    })
  }, [])

  const setExerciseNote = useCallback((exerciseId: string, date: string, text: string) => {
    setExerciseNotes((current) => {
      const forExercise = current[exerciseId] ?? {}
      if (!text) {
        if (!(date in forExercise)) return current
        const { [date]: _removed, ...rest } = forExercise
        const { [exerciseId]: _dropped, ...others } = current
        return Object.keys(rest).length ? { ...others, [exerciseId]: rest } : others
      }
      return { ...current, [exerciseId]: { ...forExercise, [date]: text } }
    })
  }, [])

  const sessionsFor = useCallback((date: string) => sessions.filter((s) => s.date === date), [sessions])

  const startSession = useCallback(
    (date: string, workout?: Workout | null) => {
      const sessionExercises: SessionExercise[] = workout
        ? workout.exercises.map((planExercise) => {
            const carry = carryOverValues(findLastSet(sessions, planExercise.exerciseId))
            return {
              id: newId(),
              exerciseId: planExercise.exerciseId,
              sets: Array.from({ length: Math.max(1, planExercise.sets) }, () => ({ ...emptySet(), ...carry })),
              restSec: planExercise.restSec ?? DEFAULT_REST_SEC,
              linkedToNext: planExercise.linkedToNext,
            }
          })
        : []
      const session: Session = {
        id: newId(),
        date,
        workoutId: workout?.id,
        workoutName: workout?.name,
        exercises: sessionExercises,
        startedAt: new Date().toISOString(),
      }
      setSessions((current) => [...current, session])
      return session
    },
    [sessions],
  )

  const addSessionExercise = useCallback(
    (sessionId: string, exerciseId: string) => {
      const carry = carryOverValues(findLastSet(sessions, exerciseId))
      setSessions((current) =>
        current.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                exercises: [
                  ...s.exercises,
                  { id: newId(), exerciseId, sets: [{ ...emptySet(), ...carry }], restSec: DEFAULT_REST_SEC },
                ],
              },
        ),
      )
    },
    [sessions],
  )

  const removeSessionExercise = useCallback((sessionId: string, sessionExerciseId: string) => {
    setSessions((current) =>
      current.map((s) => {
        if (s.id !== sessionId) return s
        const idx = s.exercises.findIndex((e) => e.id === sessionExerciseId)
        if (idx === -1) return s
        const exercises = s.exercises
          .filter((e) => e.id !== sessionExerciseId)
          .map((e, i) => (idx > 0 && i === idx - 1 ? { ...e, linkedToNext: false } : e))
        return { ...s, exercises }
      }),
    )
  }, [])

  const moveSessionExercise = useCallback((sessionId: string, sessionExerciseId: string, direction: 'up' | 'down') => {
    setSessions((current) =>
      current.map((s) =>
        s.id !== sessionId ? s : { ...s, exercises: moveGroup(s.exercises, sessionExerciseId, direction) },
      ),
    )
  }, [])

  const addSet = useCallback(
    (sessionId: string, sessionExerciseId: string, set?: Partial<SetLog>) => {
      let carry: Partial<SetLog> | undefined = set
      if (!carry) {
        const session = sessions.find((s) => s.id === sessionId)
        const exercise = session?.exercises.find((e) => e.id === sessionExerciseId)
        carry = exercise ? carryOverValues(findLastSet(sessions, exercise.exerciseId)) : {}
      }
      setSessions((current) =>
        current.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                exercises: s.exercises.map((e) =>
                  e.id !== sessionExerciseId ? e : { ...e, sets: [...e.sets, { ...emptySet(), ...carry }] },
                ),
              },
        ),
      )
    },
    [sessions],
  )

  const updateSet = useCallback(
    (sessionId: string, sessionExerciseId: string, setId: string, patch: Partial<SetLog>) => {
      const cascade: Partial<SetLog> = {}
      for (const key of CASCADE_SET_KEYS) {
        if (patch[key] !== undefined) cascade[key] = patch[key]
      }
      const hasCascade = Object.keys(cascade).length > 0

      setSessions((current) =>
        current.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                exercises: s.exercises.map((e) => {
                  if (e.id !== sessionExerciseId) return e
                  const idx = e.sets.findIndex((set) => set.id === setId)
                  if (idx === -1) return e
                  return {
                    ...e,
                    sets: e.sets.map((set, i) => {
                      if (set.id === setId) return { ...set, ...patch }
                      /** Gagner en vitesse de saisie : une série tenue pour acquise (répétée) hérite de la valeur qu'on vient de rentrer, tant qu'elle n'a pas déjà été validée. */
                      if (hasCascade && i > idx && !set.done) return { ...set, ...cascade }
                      return set
                    }),
                  }
                }),
              },
        ),
      )
    },
    [],
  )

  const updateSessionExerciseRest = useCallback(
    (sessionId: string, sessionExerciseId: string, restSec: number) => {
      setSessions((current) =>
        current.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                exercises: s.exercises.map((e) =>
                  e.id !== sessionExerciseId ? e : { ...e, restSec: Math.max(0, restSec) },
                ),
              },
        ),
      )
    },
    [],
  )

  const updateSessionExerciseCardioUnit = useCallback(
    (sessionId: string, sessionExerciseId: string, unit: 'min' | 'km') => {
      setSessions((current) =>
        current.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                exercises: s.exercises.map((e) => (e.id !== sessionExerciseId ? e : { ...e, cardioUnit: unit })),
              },
        ),
      )
    },
    [],
  )

  const removeSet = useCallback((sessionId: string, sessionExerciseId: string, setId: string) => {
    setSessions((current) =>
      current.map((s) =>
        s.id !== sessionId
          ? s
          : {
              ...s,
              exercises: s.exercises.map((e) =>
                e.id !== sessionExerciseId ? e : { ...e, sets: e.sets.filter((set) => set.id !== setId) },
              ),
            },
      ),
    )
  }, [])

  const finishSession = useCallback((sessionId: string) => {
    setSessions((current) =>
      current.map((s) => (s.id === sessionId ? { ...s, finishedAt: new Date().toISOString() } : s)),
    )
  }, [])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((current) => current.filter((s) => s.id !== sessionId))
  }, [])

  const renameSession = useCallback((sessionId: string, name: string) => {
    setSessions((current) => current.map((s) => (s.id === sessionId ? { ...s, workoutName: name } : s)))
  }, [])

  /** Dernières séries validées pour un exercice, avant une date donnée : la référence "dernière fois". */
  const lastPerformance = useCallback(
    (exerciseId: string, beforeDate: string) => {
      const candidates = sessions
        .filter((s) => s.date < beforeDate && s.finishedAt)
        .sort((a, b) => b.date.localeCompare(a.date))
      for (const session of candidates) {
        const match = session.exercises.find((e) => e.exerciseId === exerciseId)
        const done = match?.sets.filter(
          (set) =>
            set.done &&
            (set.weight > 0 || (set.durationMin ?? 0) > 0 || (set.distanceKm ?? 0) > 0 || (set.durationSec ?? 0) > 0),
        )
        if (done && done.length) return done
      }
      return null
    },
    [sessions],
  )

  const resetAll = useCallback(() => {
    clearAll()
    setOnboarded(false)
    setCustomExercises([])
    setFavoriteExerciseIds([])
    setWorkouts([])
    setSchedules([])
    setSessions([])
    setDayNotes({})
    setExerciseNotes({})
    setUnits(DEFAULT_UNITS)
  }, [])

  const exportData = useCallback(() => {
    const data: AppExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      lang,
      units,
      customExercises,
      favoriteExerciseIds,
      workouts,
      schedules,
      sessions,
      dayNotes,
      exerciseNotes,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `fufsgym-${todayKey()}.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, [lang, units, customExercises, favoriteExerciseIds, workouts, schedules, sessions, dayNotes, exerciseNotes])

  const importData = useCallback((data: unknown): boolean => {
    if (!isAppExportData(data)) return false
    setLangState(data.lang)
    setUnits(data.units)
    setCustomExercises(data.customExercises)
    setFavoriteExerciseIds(data.favoriteExerciseIds)
    setWorkouts(data.workouts)
    setSchedules(data.schedules)
    setSessions(data.sessions)
    setDayNotes(data.dayNotes)
    setExerciseNotes(migrateExerciseNotes(data.exerciseNotes ?? {}))
    return true
  }, [])

  const startRestTimer = useCallback((seconds: number, options?: { label?: string; skipLabel?: string }) => {
    restTimerKeyRef.current += 1
    setActiveRestTimer({
      key: restTimerKeyRef.current,
      totalMs: Math.max(1, seconds) * 1000,
      startedAt: Date.now(),
      label: options?.label,
      skipLabel: options?.skipLabel,
      minimized: false,
    })
  }, [])

  const extendRestTimer = useCallback((deltaMs: number) => {
    setActiveRestTimer((current) => (current ? { ...current, totalMs: Math.max(0, current.totalMs + deltaMs) } : current))
  }, [])

  const minimizeRestTimer = useCallback(() => {
    setActiveRestTimer((current) => (current ? { ...current, minimized: true } : current))
  }, [])

  const restoreRestTimer = useCallback(() => {
    setActiveRestTimer((current) => (current ? { ...current, minimized: false } : current))
  }, [])

  const stopRestTimer = useCallback(() => {
    setActiveRestTimer(null)
  }, [])

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang: setLangState,
      t,
      units,
      updateUnits,
      onboarded,
      completeOnboarding: () => setOnboarded(true),
      exercises,
      customExercises,
      addCustomExercise,
      removeCustomExercise,
      favoriteExerciseIds,
      toggleFavoriteExercise,
      exerciseById,
      workouts,
      addWorkout,
      renameWorkout,
      removeWorkout,
      addExercise,
      replaceWorkoutExercises,
      updateExercise,
      removeExercise,
      setSupersetLink,
      moveExercise,
      schedules,
      scheduleForWorkout,
      addSchedule,
      updateSchedule,
      removeSchedule,
      dayNotes,
      setDayNote,
      exerciseNotes,
      setExerciseNote,
      sessions,
      sessionsFor,
      startSession,
      addSessionExercise,
      removeSessionExercise,
      moveSessionExercise,
      addSet,
      updateSet,
      removeSet,
      updateSessionExerciseRest,
      updateSessionExerciseCardioUnit,
      finishSession,
      deleteSession,
      renameSession,
      lastPerformance,
      resetAll,
      exportData,
      importData,
      activeRestTimer,
      startRestTimer,
      extendRestTimer,
      minimizeRestTimer,
      restoreRestTimer,
      stopRestTimer,
    }),
    [
      lang,
      t,
      units,
      updateUnits,
      onboarded,
      exercises,
      customExercises,
      addCustomExercise,
      removeCustomExercise,
      favoriteExerciseIds,
      toggleFavoriteExercise,
      exerciseById,
      workouts,
      addWorkout,
      renameWorkout,
      removeWorkout,
      addExercise,
      replaceWorkoutExercises,
      updateExercise,
      removeExercise,
      setSupersetLink,
      moveExercise,
      schedules,
      scheduleForWorkout,
      addSchedule,
      updateSchedule,
      removeSchedule,
      dayNotes,
      setDayNote,
      exerciseNotes,
      setExerciseNote,
      sessions,
      sessionsFor,
      startSession,
      addSessionExercise,
      removeSessionExercise,
      moveSessionExercise,
      addSet,
      updateSet,
      removeSet,
      updateSessionExerciseRest,
      updateSessionExerciseCardioUnit,
      finishSession,
      deleteSession,
      renameSession,
      lastPerformance,
      resetAll,
      exportData,
      importData,
      activeRestTimer,
      startRestTimer,
      extendRestTimer,
      minimizeRestTimer,
      restoreRestTimer,
      stopRestTimer,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp doit être utilisé dans un AppProvider')
  return context
}
