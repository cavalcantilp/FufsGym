import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { BUILTIN_EXERCISES } from '../lib/exercises'
import { load, save, clearAll, STORAGE_KEYS } from '../lib/storage'
import { nextFreeLetter } from '../lib/schedule'
import { detectLang, TRANSLATIONS, type TranslationKey } from '../i18n/translations'
import type {
  DaySchedule,
  Exercise,
  Lang,
  Plan,
  PlanDay,
  PlanExercise,
  Session,
  SessionExercise,
  SetLog,
  Units,
} from '../lib/types'

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const DEFAULT_UNITS: Units = { weight: 'kg', length: 'cm' }

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
  exerciseById: (id: string) => Exercise | undefined

  plans: Plan[]
  addPlan: (name: string) => Plan
  renamePlan: (id: string, name: string) => void
  removePlan: (id: string) => void
  addDay: (planId: string, name: string) => void
  renameDay: (planId: string, dayId: string, name: string) => void
  removeDay: (planId: string, dayId: string) => void
  addPlanExercise: (planId: string, dayId: string, entry: Omit<PlanExercise, 'id'>) => void
  updatePlanExercise: (planId: string, dayId: string, entryId: string, patch: Partial<PlanExercise>) => void
  removePlanExercise: (planId: string, dayId: string, entryId: string) => void

  schedules: DaySchedule[]
  schedulesForPlan: (planId: string) => DaySchedule[]
  scheduleForDay: (dayId: string) => DaySchedule | undefined
  /** Crée la programmation d'un jour avec la prochaine lettre libre ; `null` si les dix sont déjà prises. */
  addSchedule: (planId: string, dayId: string) => DaySchedule | null
  updateSchedule: (id: string, patch: Partial<Pick<DaySchedule, 'weekdays' | 'startDate' | 'endDate'>>) => void
  removeSchedule: (id: string) => void

  sessions: Session[]
  sessionsFor: (date: string) => Session[]
  startSession: (date: string, day?: { planId: string; day: PlanDay } | null) => Session
  addSessionExercise: (sessionId: string, exerciseId: string) => void
  removeSessionExercise: (sessionId: string, sessionExerciseId: string) => void
  addSet: (sessionId: string, sessionExerciseId: string, set?: Partial<SetLog>) => void
  updateSet: (sessionId: string, sessionExerciseId: string, setId: string, patch: Partial<SetLog>) => void
  removeSet: (sessionId: string, sessionExerciseId: string, setId: string) => void
  finishSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  lastPerformance: (exerciseId: string, beforeDate: string) => SetLog[] | null

  resetAll: () => void
}

const AppContext = createContext<AppState | null>(null)

const emptySet = (): SetLog => ({ id: newId(), weight: 0, reps: 0, done: false })

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => load(STORAGE_KEYS.lang, detectLang()))
  const [units, setUnits] = useState<Units>(() => ({ ...DEFAULT_UNITS, ...load(STORAGE_KEYS.units, {} as Partial<Units>) }))
  const [onboarded, setOnboarded] = useState<boolean>(() => load(STORAGE_KEYS.onboarded, false))
  const [customExercises, setCustomExercises] = useState<Exercise[]>(() =>
    load(STORAGE_KEYS.customExercises, []),
  )
  const [plans, setPlans] = useState<Plan[]>(() => load(STORAGE_KEYS.plans, []))
  const [schedules, setSchedules] = useState<DaySchedule[]>(() => load(STORAGE_KEYS.schedules, []))
  const [sessions, setSessions] = useState<Session[]>(() => load(STORAGE_KEYS.sessions, []))

  useEffect(() => save(STORAGE_KEYS.lang, lang), [lang])
  useEffect(() => save(STORAGE_KEYS.units, units), [units])
  useEffect(() => save(STORAGE_KEYS.onboarded, onboarded), [onboarded])
  useEffect(() => save(STORAGE_KEYS.customExercises, customExercises), [customExercises])
  useEffect(() => save(STORAGE_KEYS.plans, plans), [plans])
  useEffect(() => save(STORAGE_KEYS.schedules, schedules), [schedules])
  useEffect(() => save(STORAGE_KEYS.sessions, sessions), [sessions])

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

  const addPlan = useCallback((name: string) => {
    const plan: Plan = { id: newId(), name, days: [], createdAt: new Date().toISOString() }
    setPlans((current) => [...current, plan])
    return plan
  }, [])

  const renamePlan = useCallback((id: string, name: string) => {
    setPlans((current) => current.map((p) => (p.id === id ? { ...p, name } : p)))
  }, [])

  const removePlan = useCallback((id: string) => {
    setPlans((current) => current.filter((p) => p.id !== id))
    setSchedules((current) => current.filter((s) => s.planId !== id))
  }, [])

  const addDay = useCallback((planId: string, name: string) => {
    setPlans((current) =>
      current.map((p) =>
        p.id === planId ? { ...p, days: [...p.days, { id: newId(), name, exercises: [] }] } : p,
      ),
    )
  }, [])

  const renameDay = useCallback((planId: string, dayId: string, name: string) => {
    setPlans((current) =>
      current.map((p) =>
        p.id !== planId
          ? p
          : { ...p, days: p.days.map((d) => (d.id === dayId ? { ...d, name } : d)) },
      ),
    )
  }, [])

  const removeDay = useCallback((planId: string, dayId: string) => {
    setPlans((current) =>
      current.map((p) => (p.id !== planId ? p : { ...p, days: p.days.filter((d) => d.id !== dayId) })),
    )
    setSchedules((current) => current.filter((s) => s.dayId !== dayId))
  }, [])

  const addPlanExercise = useCallback((planId: string, dayId: string, entry: Omit<PlanExercise, 'id'>) => {
    setPlans((current) =>
      current.map((p) =>
        p.id !== planId
          ? p
          : {
              ...p,
              days: p.days.map((d) =>
                d.id !== dayId ? d : { ...d, exercises: [...d.exercises, { ...entry, id: newId() }] },
              ),
            },
      ),
    )
  }, [])

  const updatePlanExercise = useCallback(
    (planId: string, dayId: string, entryId: string, patch: Partial<PlanExercise>) => {
      setPlans((current) =>
        current.map((p) =>
          p.id !== planId
            ? p
            : {
                ...p,
                days: p.days.map((d) =>
                  d.id !== dayId
                    ? d
                    : { ...d, exercises: d.exercises.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) },
                ),
              },
        ),
      )
    },
    [],
  )

  const removePlanExercise = useCallback((planId: string, dayId: string, entryId: string) => {
    setPlans((current) =>
      current.map((p) =>
        p.id !== planId
          ? p
          : {
              ...p,
              days: p.days.map((d) =>
                d.id !== dayId ? d : { ...d, exercises: d.exercises.filter((e) => e.id !== entryId) },
              ),
            },
      ),
    )
  }, [])

  const schedulesForPlan = useCallback(
    (planId: string) => schedules.filter((s) => s.planId === planId),
    [schedules],
  )

  const scheduleForDay = useCallback(
    (dayId: string) => schedules.find((s) => s.dayId === dayId),
    [schedules],
  )

  const addSchedule = useCallback(
    (planId: string, dayId: string) => {
      const letter = nextFreeLetter(schedules)
      if (!letter) return null
      const created: DaySchedule = { id: newId(), planId, dayId, letter, weekdays: [] }
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

  const sessionsFor = useCallback((date: string) => sessions.filter((s) => s.date === date), [sessions])

  const startSession = useCallback((date: string, day?: { planId: string; day: PlanDay } | null) => {
    const sessionExercises: SessionExercise[] = day
      ? day.day.exercises.map((planExercise) => ({
          id: newId(),
          exerciseId: planExercise.exerciseId,
          sets: Array.from({ length: Math.max(1, planExercise.sets) }, () => emptySet()),
        }))
      : []
    const session: Session = {
      id: newId(),
      date,
      planId: day?.planId,
      dayId: day?.day.id,
      dayName: day?.day.name,
      exercises: sessionExercises,
      startedAt: new Date().toISOString(),
    }
    setSessions((current) => [...current, session])
    return session
  }, [])

  const addSessionExercise = useCallback((sessionId: string, exerciseId: string) => {
    setSessions((current) =>
      current.map((s) =>
        s.id !== sessionId
          ? s
          : { ...s, exercises: [...s.exercises, { id: newId(), exerciseId, sets: [emptySet()] }] },
      ),
    )
  }, [])

  const removeSessionExercise = useCallback((sessionId: string, sessionExerciseId: string) => {
    setSessions((current) =>
      current.map((s) =>
        s.id !== sessionId ? s : { ...s, exercises: s.exercises.filter((e) => e.id !== sessionExerciseId) },
      ),
    )
  }, [])

  const addSet = useCallback((sessionId: string, sessionExerciseId: string, set?: Partial<SetLog>) => {
    setSessions((current) =>
      current.map((s) =>
        s.id !== sessionId
          ? s
          : {
              ...s,
              exercises: s.exercises.map((e) =>
                e.id !== sessionExerciseId ? e : { ...e, sets: [...e.sets, { ...emptySet(), ...set }] },
              ),
            },
      ),
    )
  }, [])

  const updateSet = useCallback(
    (sessionId: string, sessionExerciseId: string, setId: string, patch: Partial<SetLog>) => {
      setSessions((current) =>
        current.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                exercises: s.exercises.map((e) =>
                  e.id !== sessionExerciseId
                    ? e
                    : { ...e, sets: e.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)) },
                ),
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

  /** Dernières séries validées pour un exercice, avant une date donnée : la référence "dernière fois". */
  const lastPerformance = useCallback(
    (exerciseId: string, beforeDate: string) => {
      const candidates = sessions
        .filter((s) => s.date < beforeDate && s.finishedAt)
        .sort((a, b) => b.date.localeCompare(a.date))
      for (const session of candidates) {
        const match = session.exercises.find((e) => e.exerciseId === exerciseId)
        const done = match?.sets.filter((set) => set.done && set.weight > 0)
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
    setPlans([])
    setSchedules([])
    setSessions([])
    setUnits(DEFAULT_UNITS)
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
      exerciseById,
      plans,
      addPlan,
      renamePlan,
      removePlan,
      addDay,
      renameDay,
      removeDay,
      addPlanExercise,
      updatePlanExercise,
      removePlanExercise,
      schedules,
      schedulesForPlan,
      scheduleForDay,
      addSchedule,
      updateSchedule,
      removeSchedule,
      sessions,
      sessionsFor,
      startSession,
      addSessionExercise,
      removeSessionExercise,
      addSet,
      updateSet,
      removeSet,
      finishSession,
      deleteSession,
      lastPerformance,
      resetAll,
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
      exerciseById,
      plans,
      addPlan,
      renamePlan,
      removePlan,
      addDay,
      renameDay,
      removeDay,
      addPlanExercise,
      updatePlanExercise,
      removePlanExercise,
      schedules,
      schedulesForPlan,
      scheduleForDay,
      addSchedule,
      updateSchedule,
      removeSchedule,
      sessions,
      sessionsFor,
      startSession,
      addSessionExercise,
      removeSessionExercise,
      addSet,
      updateSet,
      removeSet,
      finishSession,
      deleteSession,
      lastPerformance,
      resetAll,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp doit être utilisé dans un AppProvider')
  return context
}
