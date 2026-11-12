import { useEffect, useRef, useState } from 'react'
import type Anthropic from '@anthropic-ai/sdk'
import { useApp } from '../state/AppContext'
import { coachSystemPrompt, runCoachTurn, type CoachToolExecutor } from '../lib/coach'
import { AI_KEY_EVENT, AI_MODELS, AI_MODEL_INFO, loadAiKey, loadAiModel, saveAiModel, type AiModel } from '../lib/wizardAi'
import { exerciseName, MUSCLE_GROUPS } from '../lib/exercises'
import { load, save, STORAGE_KEYS } from '../lib/storage'
import { todayKey } from '../lib/date'
import { IconClose, IconCoach, IconSend, IconTrash } from './icons'
import type { Equipment, MuscleGroup, PlanExercise, Weekday } from '../lib/types'
import type { TranslationKey } from '../i18n/translations'

interface ViewMessage {
  role: 'user' | 'coach' | 'action' | 'error'
  text: string
  ok?: boolean
}

interface StoredChat {
  api: Anthropic.MessageParam[]
  view: ViewMessage[]
  costUsd: number
}

const EMPTY: StoredChat = { api: [], view: [], costUsd: 0 }
const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
/** Laisse React appliquer une modification avant de relire l'état. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 40))

/** Bouton flottant du coach et conversation plein écran. N'apparaît qu'avec une clé Anthropic validée. */
export function CoachChat() {
  const app = useApp()
  // Les outils s'exécutent pendant un appel asynchrone : ils lisent toujours le dernier état connu.
  const appRef = useRef(app)
  appRef.current = app
  const { t, lang } = app

  const [aiKey, setAiKey] = useState(loadAiKey)
  const [model, setModel] = useState<AiModel>(loadAiModel)
  const [open, setOpen] = useState(false)
  const [chat, setChat] = useState<StoredChat>(() => ({ ...EMPTY, ...load<Partial<StoredChat>>(STORAGE_KEYS.coachChat, {}) }))
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingActions, setPendingActions] = useState<ViewMessage[]>([])
  const [confirm, setConfirm] = useState<{ text: string; resolve: (accepted: boolean) => void } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const refresh = () => setAiKey(loadAiKey())
    window.addEventListener(AI_KEY_EVENT, refresh)
    return () => window.removeEventListener(AI_KEY_EVENT, refresh)
  }, [])

  useEffect(() => save(STORAGE_KEYS.coachChat, chat), [chat])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' })
  }, [open, chat.view.length, pendingActions.length, busy, confirm])

  // La page derrière ne défile pas pendant la conversation.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!aiKey.valid) return null

  const execute: CoachToolExecutor = async (name, input) => {
    const state = appRef.current
    const nameOf = (exerciseId: string) => {
      const exercise = state.exerciseById(exerciseId)
      return exercise ? exerciseName(exercise, state.t) : exerciseId
    }
    const fail = (error: string) => ({ ok: false, result: { error } })
    const activeSession = () => appRef.current.sessionsFor(todayKey()).find((session) => !session.finishedAt)
    const planEntries = (raw: unknown): Omit<PlanExercise, 'id'>[] | string => {
      if (!Array.isArray(raw) || raw.length === 0) return 'exercises doit contenir au moins un exercice'
      const entries: Omit<PlanExercise, 'id'>[] = []
      for (const item of raw as Record<string, unknown>[]) {
        const exerciseId = String(item?.exerciseId ?? '')
        if (!state.exerciseById(exerciseId)) return `Exercice inconnu : ${exerciseId}. Utilise search_exercises pour trouver l'identifiant.`
        const sets = Math.round(Number(item.sets))
        const rest = Math.round(Number(item.restSec))
        entries.push({
          exerciseId,
          sets: Number.isFinite(sets) ? Math.min(20, Math.max(1, sets)) : 3,
          reps: String(item.reps ?? '10').slice(0, 20),
          ...(Number.isFinite(rest) && rest > 0 ? { restSec: Math.min(900, rest) } : {}),
        })
      }
      return entries
    }
    const weekdaysOf = (raw: unknown) => (Array.isArray(raw) ? WEEKDAYS.filter((day) => raw.includes(day)) : [])

    switch (name) {
      case 'get_overview': {
        const finished = state.sessions.filter((session) => session.finishedAt).sort((a, b) => b.date.localeCompare(a.date))
        const session = activeSession()
        const describe = (exercises: typeof finished[number]['exercises']) =>
          exercises.map((entry) => ({
            exerciseId: entry.exerciseId,
            name: nameOf(entry.exerciseId),
            sets: entry.sets.map((set) => `${set.weight}kg x ${set.reps}${set.done ? '' : ' (à faire)'}`),
          }))
        return {
          ok: true,
          result: {
            today: todayKey(),
            weightUnitShown: state.units.weight,
            workouts: state.workouts.map((workout) => {
              const schedule = state.scheduleForWorkout(workout.id)
              return {
                workoutId: workout.id,
                name: workout.name,
                ...(workout.objective ? { objective: workout.objective } : {}),
                weekdays: schedule?.weekdays ?? [],
                ...(schedule?.endDate ? { endDate: schedule.endDate } : {}),
                exercises: workout.exercises.map((entry) => ({
                  exerciseId: entry.exerciseId,
                  name: nameOf(entry.exerciseId),
                  sets: entry.sets,
                  reps: entry.reps,
                  restSec: entry.restSec,
                  ...(entry.targetWeight ? { targetWeightKg: entry.targetWeight } : {}),
                })),
              }
            }),
            activeSession: session ? { name: session.workoutName ?? null, startedAt: session.startedAt, exercises: describe(session.exercises) } : null,
            finishedSessionsTotal: finished.length,
            recentSessions: finished.slice(0, 8).map((entry) => ({ date: entry.date, name: entry.workoutName ?? null, exercises: describe(entry.exercises) })),
          },
        }
      }
      case 'search_exercises': {
        const words = normalize(String(input.query ?? '')).split(/\s+/).filter(Boolean)
        const muscle = MUSCLE_GROUPS.includes(input.muscle as MuscleGroup) ? (input.muscle as MuscleGroup) : null
        const matches = state.exercises
          .filter((exercise) => !muscle || exercise.muscle === muscle)
          .filter((exercise) => {
            const haystack = normalize(`${exerciseName(exercise, state.t)} ${exercise.name} ${exercise.id}`)
            return words.every((word) => haystack.includes(word))
          })
        return {
          ok: true,
          result: {
            total: matches.length,
            exercises: matches.slice(0, 40).map((exercise) => ({ exerciseId: exercise.id, name: exerciseName(exercise, state.t), muscle: exercise.muscle, equipment: exercise.equipment ?? null })),
          },
        }
      }
      case 'get_exercise_history': {
        const exerciseId = String(input.exerciseId ?? '')
        if (!state.exerciseById(exerciseId)) return fail(`Exercice inconnu : ${exerciseId}`)
        const history = state.sessions
          .filter((session) => session.finishedAt)
          .sort((a, b) => b.date.localeCompare(a.date))
          .flatMap((session) =>
            session.exercises
              .filter((entry) => entry.exerciseId === exerciseId)
              .map((entry) => ({ date: session.date, sets: entry.sets.filter((set) => set.done).map((set) => ({ weightKg: set.weight, reps: set.reps })) })),
          )
          .filter((entry) => entry.sets.length > 0)
        return { ok: true, result: { name: nameOf(exerciseId), sessionsCount: history.length, lastSessions: history.slice(0, 6) } }
      }
      case 'create_workout': {
        const entries = planEntries(input.exercises)
        if (typeof entries === 'string') return fail(entries)
        const workoutName = String(input.name ?? '').trim().slice(0, 60)
        if (!workoutName) return fail('name est obligatoire')
        const objective = String(input.objective ?? '').trim().slice(0, 300)
        state.addGeneratedWorkouts([{ name: workoutName, exercises: entries, weekdays: weekdaysOf(input.weekdays), ...(objective ? { objective } : {}) }])
        await settle()
        const created = [...appRef.current.workouts].reverse().find((workout) => workout.name === workoutName)
        return { ok: true, result: { created: true, workoutId: created?.id, name: workoutName, exercises: entries.length, weekdays: weekdaysOf(input.weekdays) } }
      }
      case 'update_workout': {
        const workout = state.workouts.find((entry) => entry.id === input.workoutId)
        if (!workout) return fail('Entraînement introuvable. Appelle get_overview pour obtenir les identifiants.')
        if (input.exercises !== undefined) {
          const entries = planEntries(input.exercises)
          if (typeof entries === 'string') return fail(entries)
          // On garde les réglages personnels (charge visée, note) des exercices conservés.
          const previous = new Map(workout.exercises.map((entry) => [entry.exerciseId, entry]))
          state.replaceWorkoutExercises(
            workout.id,
            entries.map((entry) => {
              const old = previous.get(entry.exerciseId)
              return { ...(old ? { note: old.note, targetWeight: old.targetWeight, targetWeightDate: old.targetWeightDate } : {}), ...entry }
            }),
          )
        }
        const newName = String(input.name ?? '').trim().slice(0, 60)
        if (newName) state.renameWorkout(workout.id, newName)
        await settle()
        return { ok: true, result: { updated: true, name: newName || workout.name } }
      }
      case 'delete_workout': {
        const workout = state.workouts.find((entry) => entry.id === input.workoutId)
        if (!workout) return fail('Entraînement introuvable.')
        const accepted = await new Promise<boolean>((resolve) => setConfirm({ text: state.t('coach.confirmDelete', { name: workout.name }), resolve }))
        setConfirm(null)
        if (!accepted) return fail("L'utilisateur a refusé la suppression. Ne réessaie pas sans nouvelle demande.")
        appRef.current.removeWorkout(workout.id)
        await settle()
        return { ok: true, result: { deleted: true, name: workout.name } }
      }
      case 'set_schedule': {
        const workout = state.workouts.find((entry) => entry.id === input.workoutId)
        if (!workout) return fail('Entraînement introuvable.')
        const weekdays = weekdaysOf(input.weekdays)
        const existing = state.scheduleForWorkout(workout.id)
        const endDate = /^\d{4}-\d{2}-\d{2}$/.test(String(input.endDate ?? '')) ? String(input.endDate) : undefined
        if (weekdays.length === 0) {
          if (existing) state.removeSchedule(existing.id)
        } else {
          const schedule = existing ?? state.addSchedule(workout.id)
          if (!schedule) return fail('Les 26 lettres de programmation sont déjà prises : il faut en libérer une.')
          await settle()
          appRef.current.updateSchedule(schedule.id, { weekdays, ...(endDate ? { endDate } : {}) })
        }
        await settle()
        return { ok: true, result: { name: workout.name, weekdays } }
      }
      case 'start_session': {
        if (activeSession()) return fail('Une séance est déjà en cours.')
        const workout = input.workoutId ? state.workouts.find((entry) => entry.id === input.workoutId) : null
        if (input.workoutId && !workout) return fail('Entraînement introuvable.')
        state.startSession(todayKey(), workout)
        await settle()
        return { ok: true, result: { started: true, name: workout?.name ?? null } }
      }
      case 'add_session_exercise':
      case 'log_set': {
        const exerciseId = String(input.exerciseId ?? '')
        if (!state.exerciseById(exerciseId)) return fail(`Exercice inconnu : ${exerciseId}`)
        let session = activeSession()
        if (!session) return fail("Aucune séance en cours. Démarre-en une avec start_session si l'utilisateur le veut.")
        let entry = session.exercises.find((item) => item.exerciseId === exerciseId)
        if (!entry) {
          state.addSessionExercise(session.id, exerciseId)
          await settle()
          session = activeSession()
          entry = session?.exercises.find((item) => item.exerciseId === exerciseId)
          if (!session || !entry) return fail("Impossible d'ajouter l'exercice à la séance.")
        } else if (name === 'add_session_exercise') {
          return { ok: true, result: { alreadyInSession: true, name: nameOf(exerciseId) } }
        }
        if (name === 'add_session_exercise') return { ok: true, result: { added: true, name: nameOf(exerciseId) } }
        const weight = Math.max(0, Number(input.weightKg) || 0)
        const reps = Math.max(0, Math.round(Number(input.reps) || 0))
        const next = entry.sets.find((set) => !set.done)
        if (next) appRef.current.updateSet(session.id, entry.id, next.id, { weight, reps, done: true })
        else appRef.current.addSet(session.id, entry.id, { weight, reps, done: true })
        await settle()
        const after = activeSession()?.exercises.find((item) => item.id === entry!.id)
        return { ok: true, result: { logged: `${weight}kg x ${reps}`, name: nameOf(exerciseId), setsDone: after?.sets.filter((set) => set.done).length, setsPlanned: after?.sets.length } }
      }
      case 'finish_session': {
        const session = activeSession()
        if (!session) return fail('Aucune séance en cours.')
        state.finishSession(session.id)
        await settle()
        return { ok: true, result: { finished: true } }
      }
      case 'start_rest_timer': {
        const seconds = Math.min(900, Math.max(5, Math.round(Number(input.seconds) || 0)))
        state.startRestTimer(seconds)
        state.minimizeRestTimer()
        return { ok: true, result: { started: true, seconds } }
      }
      case 'set_day_note': {
        const date = String(input.date ?? '')
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('date doit être au format AAAA-MM-JJ')
        state.setDayNote(date, String(input.text ?? '').slice(0, 1000))
        return { ok: true, result: { saved: true, date } }
      }
      case 'create_custom_exercise': {
        const exerciseLabel = String(input.name ?? '').trim().slice(0, 80)
        if (!exerciseLabel || !MUSCLE_GROUPS.includes(input.muscle as MuscleGroup)) return fail('name et muscle sont obligatoires')
        const equipment = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'].includes(String(input.equipment)) ? (input.equipment as Equipment) : undefined
        const created = state.addCustomExercise({ name: exerciseLabel, muscle: input.muscle as MuscleGroup, ...(equipment ? { equipment } : {}) })
        await settle()
        return { ok: true, result: { exerciseId: created.id, name: created.name } }
      }
      default:
        return fail(`Outil inconnu : ${name}`)
    }
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setBusy(true)
    setPendingActions([])
    const actions: ViewMessage[] = []
    const base = chat
    setChat({ ...base, view: [...base.view, { role: 'user', text }] })
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await runCoachTurn({
        apiKey: aiKey.key,
        model,
        system: coachSystemPrompt(lang, todayKey()),
        history: base.api,
        userText: text,
        execute,
        onTool: (name, ok) => {
          // Les lectures ne sont pas des actions : seules les modifications s'affichent.
          if (name.startsWith('get_') || name === 'search_exercises') return
          const label = t(`coach.tool.${name}` as TranslationKey)
          actions.push({ role: 'action', text: ok ? label : t('coach.notDone', { action: label }), ok })
          setPendingActions([...actions])
        },
        signal: controller.signal,
      })
      const note = result.stopped === 'refusal' ? t('coach.refused') : result.stopped === 'truncated' ? t('coach.truncated') : result.stopped === 'rounds' ? t('coach.tooLong') : ''
      const view: ViewMessage[] = [...base.view, { role: 'user', text }, ...actions]
      if (result.text) view.push({ role: 'coach', text: result.text })
      if (note) view.push({ role: 'error', text: note })
      // Un tour refusé ou interrompu ne rejoint pas l'historique envoyé : on repart du dernier état sain.
      setChat({ api: result.stopped === 'done' ? result.messages : base.api, view, costUsd: base.costUsd + result.costUsd })
    } catch (error) {
      const aborted = controller.signal.aborted
      const status = (error as { status?: number })?.status
      const message = aborted ? t('coach.stopped') : status === 401 ? t('ai.invalid') : status === 429 || status === 529 ? t('coach.busy') : t('coach.failed')
      setChat({ ...base, view: [...base.view, { role: 'user', text }, ...actions, { role: 'error', text: message }] })
    } finally {
      setConfirm((current) => {
        current?.resolve(false)
        return null
      })
      setPendingActions([])
      setBusy(false)
      abortRef.current = null
    }
  }

  if (!open) {
    return (
      <button type="button" className="coach-fab" onClick={() => setOpen(true)} aria-label={t('coach.open')}>
        <IconCoach size={24} />
      </button>
    )
  }

  const suggestions: TranslationKey[] = ['coach.suggest.today', 'coach.suggest.create', 'coach.suggest.progress']

  return (
    <div className="coach-overlay" role="dialog" aria-modal="true" aria-label={t('coach.title')}>
      <header className="coach-header">
        <div className="coach-header-main">
          <span className="coach-title">{t('coach.title')}</span>
          <select
            className="coach-model"
            value={model}
            disabled={busy}
            aria-label={t('ai.modelLabel')}
            onChange={(event) => {
              const next = event.target.value as AiModel
              setModel(next)
              saveAiModel(next)
            }}
          >
            {AI_MODELS.map((key) => (
              <option key={key} value={key}>
                {AI_MODEL_INFO[key].label}
              </option>
            ))}
          </select>
        </div>
        {chat.view.length > 0 ? (
          <button type="button" className="icon-btn" disabled={busy} onClick={() => setChat(EMPTY)} aria-label={t('coach.clear')}>
            <IconTrash size={17} />
          </button>
        ) : null}
        <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label={t('coach.close')}>
          <IconClose size={20} />
        </button>
      </header>

      <div className="coach-messages">
        {chat.view.length === 0 ? (
          <div className="coach-empty">
            <p className="coach-empty-title">{t('coach.emptyTitle')}</p>
            <p className="hint">{t('coach.emptyHint')}</p>
            <div className="coach-suggestions">
              {suggestions.map((key) => (
                <button key={key} type="button" onClick={() => setDraft(t(key))}>
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {[...chat.view, ...pendingActions].map((message, index) => (
          <div key={index} className={`coach-msg ${message.role}${message.ok === false ? ' failed' : ''}`}>
            {message.role === 'action' ? (message.ok === false ? '✕ ' : '✓ ') : ''}
            {message.text}
          </div>
        ))}
        {confirm ? (
          <div className="coach-confirm">
            <p>{confirm.text}</p>
            <div className="coach-confirm-actions">
              <button type="button" className="btn danger" onClick={() => confirm.resolve(true)}>
                {t('coach.confirmYes')}
              </button>
              <button type="button" className="btn secondary" onClick={() => confirm.resolve(false)}>
                {t('coach.confirmNo')}
              </button>
            </div>
          </div>
        ) : busy ? (
          <div className="coach-msg coach thinking" aria-label={t('coach.thinking')}>
            <i />
            <i />
            <i />
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <footer className="coach-footer">
        {chat.costUsd > 0 ? <p className="coach-cost">{t('coach.cost', { cost: chat.costUsd < 0.001 ? '< 0.001' : chat.costUsd.toFixed(3) })}</p> : null}
        <div className="coach-input">
          <textarea
            rows={1}
            value={draft}
            placeholder={t('coach.placeholder')}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void send()
              }
            }}
          />
          {busy ? (
            <button type="button" className="coach-send stop" onClick={() => abortRef.current?.abort()} aria-label={t('coach.stop')}>
              <IconClose size={18} />
            </button>
          ) : (
            <button type="button" className="coach-send" disabled={!draft.trim()} onClick={() => void send()} aria-label={t('coach.send')}>
              <IconSend size={18} />
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
