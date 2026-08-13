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
import type { Exercise, Plan, PlanDay, PlanExercise, Session, SessionExercise, SetLog } from '../lib/types'

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

interface AppState {
  onboarded: boolean
  completeOnboarding: () => void

  exercises: Exercise[]
  customExercises: Exercise[]
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'custom'>) => Exercise
  removeCustomExercise: (id: string) => void
  exerciseById: (id: string) => Exercise | undefined

  plans: Plan[]
  activePlanId: string | null
  setActivePlan: (id: string | null) => void
  addPlan: (name: string) => Plan
  renamePlan: (id: string, name: string) => void
  removePlan: (id: string) => void
  addDay: (planId: string, name: string) => void
  renameDay: (planId: string, dayId: string, name: string) => void
  removeDay: (planId: string, dayId: string) => void
  addPlanExercise: (planId: string, dayId: string, entry: Omit<PlanExercise, 'id'>) => void
  updatePlanExercise: (planId: string, dayId: string, entryId: string, patch: Partial<PlanExercise>) => void
  removePlanExercise: (planId: string, dayId: string, entryId: string) => void
  nextDayFor: (planId: string) => PlanDay | null

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
  const [onboarded, setOnboarded] = useState<boolean>(() => load(STORAGE_KEYS.onboarded, false))
  const [customExercises, setCustomExercises] = useState<Exercise[]>(() =>
    load(STORAGE_KEYS.customExercises, []),
  )
  const [plans, setPlans] = useState<Plan[]>(() => load(STORAGE_KEYS.plans, []))
  const [activePlanId, setActivePlanId] = useState<string | null>(() =>
    load(STORAGE_KEYS.activePlanId, null as string | null),
  )
  const [sessions, setSessions] = useState<Session[]>(() => load(STORAGE_KEYS.sessions, []))

  useEffect(() => save(STORAGE_KEYS.onboarded, onboarded), [onboarded])
  useEffect(() => save(STORAGE_KEYS.customExercises, customExercises), [customExercises])
  useEffect(() => save(STORAGE_KEYS.plans, plans), [plans])
  useEffect(() => save(STORAGE_KEYS.activePlanId, activePlanId), [activePlanId])
  useEffect(() => save(STORAGE_KEYS.sessions, sessions), [sessions])

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
    setActivePlanId((current) => (current === id ? null : current))
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

  /** Jour suivant à proposer : celui qui suit, dans l'ordre du programme, le dernier jour effectué. */
  const nextDayFor = useCallback(
    (planId: string) => {
      const plan = plans.find((p) => p.id === planId)
      if (!plan || plan.days.length === 0) return null
      const lastWithDay = [...sessions]
        .filter((s) => s.planId === planId && s.finishedAt)
        .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt))[0]
      if (!lastWithDay?.dayId) return plan.days[0]
      const index = plan.days.findIndex((d) => d.id === lastWithDay.dayId)
      if (index === -1) return plan.days[0]
      return plan.days[(index + 1) % plan.days.length]
    },
    [plans, sessions],
  )

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
    setActivePlanId(null)
    setSessions([])
  }, [])

  const value = useMemo<AppState>(
    () => ({
      onboarded,
      completeOnboarding: () => setOnboarded(true),
      exercises,
      customExercises,
      addCustomExercise,
      removeCustomExercise,
      exerciseById,
      plans,
      activePlanId,
      setActivePlan: setActivePlanId,
      addPlan,
      renamePlan,
      removePlan,
      addDay,
      renameDay,
      removeDay,
      addPlanExercise,
      updatePlanExercise,
      removePlanExercise,
      nextDayFor,
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
      onboarded,
      exercises,
      customExercises,
      addCustomExercise,
      removeCustomExercise,
      exerciseById,
      plans,
      activePlanId,
      addPlan,
      renamePlan,
      removePlan,
      addDay,
      renameDay,
      removeDay,
      addPlanExercise,
      updatePlanExercise,
      removePlanExercise,
      nextDayFor,
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
