import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { ExercisePicker } from '../components/ExercisePicker'
import { PlanExerciseSheet } from '../components/PlanExerciseSheet'
import { WeekdayPicker } from '../components/WeekdayPicker'
import { IconCheck, IconPlus, IconTrash } from '../components/icons'
import { exerciseName, muscleLabel } from '../lib/exercises'
import { DEFAULT_REST_SEC, formatRestTime } from '../lib/rest'
import { formatNumeric, shiftDay, todayKey } from '../lib/date'
import { formatWeight } from '../lib/weightUnit'
import {
  WIZARD_DURATIONS,
  WIZARD_FOCUS,
  WIZARD_GOALS,
  WIZARD_INJURIES,
  WIZARD_LEVELS,
  WIZARD_MINUTES,
  WIZARD_TEMPLATES,
  buildWizardHistory,
  estimateMinutes,
  generateWorkouts,
  suggestAnswers,
  suggestTargets,
  type ProposedWorkout,
  type WizardAnswers,
} from '../lib/workoutWizard'
import { AI_MODEL_INFO, generateWorkoutsWithAi, loadAiKey, loadAiModel } from '../lib/wizardAi'
import type { TranslationKey } from '../i18n/translations'
import type { PlanExercise } from '../lib/types'

type Step = 'mode' | 'sessions' | 'template' | 'minutes' | 'goal' | 'level' | 'injuries' | 'focus' | 'duration' | 'target' | 'proposal'

interface Draft extends ProposedWorkout {
  name: string
}

const DEFAULT_ANSWERS: WizardAnswers = {
  mode: 'program',
  sessionsPerWeek: 3,
  singleTemplate: 'full',
  minutes: 60,
  goal: 'hypertrophy',
  level: 'regular',
  injuries: [],
  focus: [],
  durationWeeks: 8,
  target: '',
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

/** Assistant de création : quelques questions, puis une proposition d'entraînement(s) modifiable avant validation. */
export function WorkoutWizard({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t, lang, units, workouts, sessions, exercises, exerciseById, addGeneratedWorkouts } = useApp()
  const aiKey = useMemo(loadAiKey, [])
  const aiModel = useMemo(loadAiModel, [])
  const [useAi, setUseAi] = useState(false)
  const [generating, setGenerating] = useState(false)
  /** Résultat de la dernière génération par IA : coût estimé, ou échec (retour aux règles fixes). */
  const [aiResult, setAiResult] = useState<{ costUsd: number; advice: string } | 'failed' | null>(null)
  const prefilled = useMemo(() => suggestAnswers(sessions, todayKey()), [sessions])
  const [answers, setAnswers] = useState<WizardAnswers>(() => ({ ...DEFAULT_ANSWERS, ...prefilled }))
  const [stepIndex, setStepIndex] = useState(0)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [editing, setEditing] = useState<{ workout: number; entry: number } | null>(null)
  const [pickingFor, setPickingFor] = useState<number | null>(null)

  const steps: Step[] = ['mode', answers.mode === 'program' ? 'sessions' : 'template', 'minutes', 'goal', 'level', 'injuries', 'focus', 'duration', 'target', 'proposal']
  const step = steps[stepIndex]
  const patch = (changes: Partial<WizardAnswers>) => setAnswers((current) => ({ ...current, ...changes }))

  const updateDraft = (index: number, change: (draft: Draft) => Draft) =>
    setDrafts((current) => current.map((draft, i) => (i === index ? change(draft) : draft)))

  const next = async () => {
    if (steps[stepIndex + 1] === 'proposal') {
      const history = buildWizardHistory(sessions, todayKey())
      let proposals = generateWorkouts(answers, history)
      setAiResult(null)
      if (useAi && aiKey.valid) {
        setGenerating(true)
        try {
          // Catalogue en français : les identifiants suffisent au modèle, les noms l'aident à s'y retrouver.
          const result = await generateWorkoutsWithAi(aiKey.key, answers, history, exercises, aiModel, lang)
          proposals = result.workouts
          setAiResult({ costUsd: result.costUsd, advice: result.advice })
        } catch {
          setAiResult('failed')
        } finally {
          setGenerating(false)
        }
      }
      const taken = new Set(workouts.map((w) => w.name.trim().toLowerCase()))
      setDrafts(
        proposals.map((proposal) => {
          const base = `${t(`wizard.name.${proposal.template}` as TranslationKey)}${proposal.variant ? ` ${proposal.variant}` : ''}`
          let name = base
          for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n})`
          taken.add(name.toLowerCase())
          return { ...proposal, name }
        }),
      )
    }
    setStepIndex((current) => current + 1)
    window.scrollTo(0, 0)
  }

  const back = () => {
    if (stepIndex === 0) onCancel()
    else setStepIndex((current) => current - 1)
  }

  if (editing) {
    const entry = drafts[editing.workout].exercises[editing.entry]
    return (
      <PlanExerciseSheet
        exercise={exerciseById(entry.exerciseId) ?? { id: '', name: t('exercise.unknown'), muscle: 'chest', custom: true }}
        initial={{ ...entry, id: 'draft' } as PlanExercise}
        onConfirm={(target) =>
          updateDraft(editing.workout, (draft) => ({
            ...draft,
            exercises: draft.exercises.map((e, i) => (i === editing.entry ? { ...e, ...target } : e)),
          }))
        }
        onClose={() => setEditing(null)}
      />
    )
  }

  if (pickingFor !== null) {
    return (
      <ExercisePicker
        title={t('picker.addTitle')}
        onClose={() => setPickingFor(null)}
        onPick={(exercise) => {
          const isCardio = exercise.muscle === 'cardio'
          updateDraft(pickingFor, (draft) => ({
            ...draft,
            exercises: [
              ...draft.exercises,
              { exerciseId: exercise.id, sets: isCardio ? 1 : 3, reps: isCardio ? '10 min' : '10-12', restSec: DEFAULT_REST_SEC },
            ],
          }))
          setPickingFor(null)
        }}
      />
    )
  }

  const option = (key: string, active: boolean, title: string, description: string | null, onSelect: () => void) => (
    <button key={key} type="button" className={`wizard-option${active ? ' active' : ''}`} onClick={onSelect}>
      <span className="wizard-option-text">
        <span className="title">{title}</span>
        {description ? <span className="desc">{description}</span> : null}
      </span>
      <span className="wizard-option-mark">{active ? <IconCheck size={14} /> : null}</span>
    </button>
  )

  let body: React.ReactNode = null
  let question = ''
  let hint: string | null = null

  switch (step) {
    case 'mode':
      question = t('wizard.mode.q')
      body = (
        <div className="stack">
          {option('program', answers.mode === 'program', t('wizard.mode.program'), t('wizard.mode.programDesc'), () => patch({ mode: 'program' }))}
          {option('single', answers.mode === 'single', t('wizard.mode.single'), t('wizard.mode.singleDesc'), () => patch({ mode: 'single' }))}
        </div>
      )
      break
    case 'sessions':
      question = t('wizard.sessions.q')
      if (prefilled.sessionsPerWeek) hint = t('wizard.prefilled')
      body = (
        <div className="wizard-number-row">
          {[2, 3, 4, 5, 6].map((count) => (
            <button
              key={count}
              type="button"
              className={`wizard-number${answers.sessionsPerWeek === count ? ' active' : ''}`}
              onClick={() => patch({ sessionsPerWeek: count })}
            >
              {count}
            </button>
          ))}
        </div>
      )
      break
    case 'template':
      question = t('wizard.template.q')
      body = (
        <div className="stack">
          {WIZARD_TEMPLATES.map((template) =>
            option(template, answers.singleTemplate === template, t(`wizard.template.${template}` as TranslationKey), null, () =>
              patch({ singleTemplate: template }),
            ),
          )}
        </div>
      )
      break
    case 'minutes':
      question = t('wizard.minutes.q')
      if (prefilled.minutes) hint = t('wizard.prefilled')
      body = (
        <div className="wizard-number-row">
          {WIZARD_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className={`wizard-number${answers.minutes === minutes ? ' active' : ''}`}
              onClick={() => patch({ minutes })}
            >
              {minutes}
              <small>min</small>
            </button>
          ))}
        </div>
      )
      break
    case 'goal':
      question = t('wizard.goal.q')
      body = (
        <div className="stack">
          {WIZARD_GOALS.map((goal) =>
            option(
              goal,
              answers.goal === goal,
              t(`wizard.goal.${goal}` as TranslationKey),
              t(`wizard.goal.${goal}Desc` as TranslationKey),
              () => patch({ goal }),
            ),
          )}
        </div>
      )
      break
    case 'level':
      question = t('wizard.level.q')
      body = (
        <div className="stack">
          {WIZARD_LEVELS.map((level) =>
            option(
              level,
              answers.level === level,
              t(`wizard.level.${level}` as TranslationKey),
              t(`wizard.level.${level}Desc` as TranslationKey),
              () => patch({ level }),
            ),
          )}
        </div>
      )
      break
    case 'injuries':
      question = t('wizard.injuries.q')
      hint = t('wizard.injuries.hint')
      body = (
        <div className="stack">
          {WIZARD_INJURIES.map((injury) =>
            option(injury, answers.injuries.includes(injury), t(`wizard.injury.${injury}` as TranslationKey), null, () =>
              patch({ injuries: toggle(answers.injuries, injury) }),
            ),
          )}
        </div>
      )
      break
    case 'focus':
      question = t('wizard.focus.q')
      hint = t('wizard.focus.hint')
      body = (
        <div className="stack">
          {WIZARD_FOCUS.map((group) =>
            option(group, answers.focus.includes(group), group === 'glutes' ? t('wizard.focus.glutes') : muscleLabel(group, t), null, () => patch({ focus: toggle(answers.focus, group) })),
          )}
        </div>
      )
      break
    case 'duration':
      question = t('wizard.duration.q')
      hint = t('wizard.duration.hint')
      body = (
        <div className="wizard-chip-grid">
          {WIZARD_DURATIONS.map((weeks) => (
            <button
              key={weeks}
              type="button"
              className={`wizard-chip${answers.durationWeeks === weeks ? ' active' : ''}`}
              onClick={() => patch({ durationWeeks: weeks, target: useAi ? answers.target : '' })}
            >
              {t(`wizard.duration.${weeks}` as TranslationKey)}
            </button>
          ))}
        </div>
      )
      break
    case 'target': {
      const durationLabel = t(`wizard.duration.${answers.durationWeeks}` as TranslationKey)
      question = t('wizard.target.q', { duration: durationLabel })
      hint = useAi ? t('wizard.target.hintAi') : t('wizard.target.hint')
      const none = t('wizard.target.none')
      body = (
        <>
          {aiKey.valid ? (
            <label className="wizard-ai">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(event) => {
                  setUseAi(event.target.checked)
                  patch({ target: '' })
                }}
              />
              <span>
                <span className="title">{t('wizard.ai.use')}</span>
                <span className="desc">
                  {t('wizard.ai.cost', { model: AI_MODEL_INFO[aiModel].label, cost: String(AI_MODEL_INFO[aiModel].typicalUsd) })}
                </span>
              </span>
            </label>
          ) : null}
          {useAi ? (
            <div className="field">
              <label htmlFor="wizard-target">{t('wizard.target.textLabel')}</label>
              <textarea
                id="wizard-target"
                rows={3}
                maxLength={300}
                value={answers.target}
                onChange={(event) => patch({ target: event.target.value })}
                placeholder={t('wizard.target.placeholder')}
              />
            </div>
          ) : (
            <div className="stack">
              {suggestTargets(answers).map(({ kind, n }) => {
                const text = t(`wizard.target.${kind}` as TranslationKey, { n })
                return option(`${kind}-${n}`, answers.target === text, text, null, () => patch({ target: answers.target === text ? '' : text }))
              })}
              {option('none', answers.target === '', none, null, () => patch({ target: '' }))}
            </div>
          )}
        </>
      )
      break
    }
    case 'proposal':
      question = t('wizard.proposal.title')
      hint = t('wizard.proposal.hint')
      body = (
        <>
          {drafts.map((draft, workoutIndex) => (
            <div className="card stack" key={workoutIndex}>
              <div>
                <input
                  type="text"
                  className="plan-name-input"
                  value={draft.name}
                  aria-label={t('workout.newName')}
                  onChange={(event) => updateDraft(workoutIndex, (d) => ({ ...d, name: event.target.value }))}
                />
                <span className="hint">
                  {draft.exercises.length} {t('unit.exercise')} · {t('wizard.proposal.estimate', { n: estimateMinutes(draft.exercises) })}
                </span>
              </div>

              <div className="wizard-exercises">
                {draft.exercises.map((entry, entryIndex) => {
                  const info = exerciseById(entry.exerciseId)
                  const isCardio = info?.muscle === 'cardio'
                  return (
                    <div className="wizard-exercise" key={`${entry.exerciseId}-${entryIndex}`}>
                      <button
                        type="button"
                        className="wizard-exercise-main"
                        onClick={() => setEditing({ workout: workoutIndex, entry: entryIndex })}
                      >
                        <span className="name">{info ? exerciseName(info, t) : t('exercise.unknown')}</span>
                        <span className="target">
                          {isCardio
                            ? entry.reps
                            : `${entry.sets} × ${entry.reps}${entry.targetWeight ? ` · ${formatWeight(entry.targetWeight, units.weight)}` : ''} · ${formatRestTime(entry.restSec ?? DEFAULT_REST_SEC)}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={t('train.removeExerciseAria')}
                        onClick={() =>
                          updateDraft(workoutIndex, (d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== entryIndex) }))
                        }
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <button type="button" className="btn secondary small" style={{ width: '100%' }} onClick={() => setPickingFor(workoutIndex)}>
                <IconPlus size={16} />
                {t('train.addExercise')}
              </button>

              <div className="field">
                <label>{t('wizard.proposal.days')}</label>
                <WeekdayPicker
                  value={draft.weekdays}
                  onToggle={(day) => updateDraft(workoutIndex, (d) => ({ ...d, weekdays: toggle(d.weekdays, day) }))}
                />
              </div>
            </div>
          ))}
          {drafts.some((draft) => draft.exercises.some((entry) => entry.targetWeight)) ? (
            <p className="hint">{t('wizard.proposal.loadsHint')}</p>
          ) : null}
          <p className="hint">{t('wizard.disclaimer')}</p>
        </>
      )
      break
  }

  const endDate = shiftDay(todayKey(), answers.durationWeeks * 7 - 1)
  const objective = answers.target.trim()
  const valid = drafts.length > 0 && drafts.every((draft) => draft.name.trim() && draft.exercises.length > 0)

  return (
    <FormPage title={t('wizard.title')} subtitle={t('wizard.step', { current: stepIndex + 1, total: steps.length })} onBack={back}>
      <div className="progress-track">
        <i style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>

      <div>
        <h2 className="screen-title">{question}</h2>
        {hint ? <p className="hint" style={{ marginTop: 6 }}>{hint}</p> : null}
      </div>

      {step === 'proposal' && aiResult === 'failed' ? <p className="hint danger">{t('wizard.ai.failed')}</p> : null}
      {step === 'proposal' ? (
        <p className="hint">
          {t('wizard.proposal.until', { duration: t(`wizard.duration.${answers.durationWeeks}` as TranslationKey), date: formatNumeric(endDate, lang) })}
          {objective ? ` · ${t('wizard.target.label', { target: objective })}` : ''}
        </p>
      ) : null}
      {step === 'proposal' && aiResult && aiResult !== 'failed' && aiResult.advice ? <p className="hint wizard-advice">{aiResult.advice}</p> : null}
      {step === 'proposal' && aiResult && aiResult !== 'failed' ? (
        <p className="hint">{t('wizard.ai.done', { cost: aiResult.costUsd < 0.001 ? '< 0.001' : aiResult.costUsd.toFixed(3) })}</p>
      ) : null}

      {body}

      {step === 'proposal' ? (
        <button
          type="button"
          className="btn"
          disabled={!valid}
          onClick={() => {
            addGeneratedWorkouts(drafts.map((draft) => ({ name: draft.name.trim(), exercises: draft.exercises, weekdays: draft.weekdays })), { objective, endDate })
            onDone()
          }}
        >
          <IconCheck size={18} />
          {drafts.length > 1 ? t('wizard.accept.program', { count: drafts.length }) : t('wizard.accept.single')}
        </button>
      ) : (
        <>
          <button type="button" className="btn" disabled={generating} onClick={() => void next()}>
            {generating ? t('wizard.ai.generating') : steps[stepIndex + 1] === 'proposal' ? t('wizard.generate') : t('wizard.next')}
          </button>
        </>
      )}
    </FormPage>
  )
}
