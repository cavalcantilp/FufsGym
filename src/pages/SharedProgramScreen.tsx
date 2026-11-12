import { useEffect, useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { IconCheck } from '../components/icons'
import { exerciseName } from '../lib/exercises'
import { formatRestTime } from '../lib/rest'
import { decodeShare, type SharedProgram } from '../lib/share'
import type { TranslationKey } from '../i18n/translations'

/** Écran d'acceptation d'un programme reçu par lien : aperçu complet, puis ajout ou refus. */
export function SharedProgramScreen({ token, onDone }: { token: string; onDone: (accepted: boolean) => void }) {
  const { t, workouts, customExercises, exerciseById, addCustomExercise, addGeneratedWorkouts } = useApp()
  const [program, setProgram] = useState<SharedProgram | null | 'invalid'>(null)

  useEffect(() => {
    let alive = true
    void decodeShare(token).then((decoded) => {
      if (alive) setProgram(decoded ?? 'invalid')
    })
    return () => {
      alive = false
    }
  }, [token])

  if (program === null) return null

  if (program === 'invalid') {
    return (
      <FormPage title={t('share.receivedTitle')} onBack={() => onDone(false)}>
        <p className="hint danger">{t('share.invalid')}</p>
        <button type="button" className="btn secondary" onClick={() => onDone(false)}>
          {t('share.close')}
        </button>
      </FormPage>
    )
  }

  const sharedCustom = new Map(program.customExercises.map((exercise) => [exercise.id, exercise]))
  const nameOf = (exerciseId: string) => {
    const known = exerciseById(exerciseId) ?? sharedCustom.get(exerciseId)
    return known ? exerciseName(known, t) : t('exercise.unknown')
  }

  const accept = () => {
    // Exercices personnalisés de l'expéditeur : repris tels quels s'ils existent déjà (même compte
    // sur deux appareils, ou même nom), sinon recréés ici avec un nouvel identifiant.
    const idMap = new Map<string, string>()
    for (const exercise of program.customExercises) {
      const existing =
        customExercises.find((mine) => mine.id === exercise.id) ??
        customExercises.find((mine) => mine.name.trim().toLowerCase() === exercise.name.toLowerCase() && mine.muscle === exercise.muscle)
      const { id: _id, custom: _custom, ...definition } = exercise
      idMap.set(exercise.id, (existing ?? addCustomExercise(definition)).id)
    }
    const taken = new Set(workouts.map((workout) => workout.name.trim().toLowerCase()))
    addGeneratedWorkouts(
      program.workouts.map((workout) => {
        let name = workout.name
        for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${workout.name} (${n})`
        taken.add(name.toLowerCase())
        return {
          name,
          objective: workout.objective,
          weekdays: workout.weekdays,
          exercises: workout.exercises
            .map((entry) => ({ ...entry, exerciseId: idMap.get(entry.exerciseId) ?? entry.exerciseId }))
            .filter((entry) => exerciseById(entry.exerciseId) || [...idMap.values()].includes(entry.exerciseId)),
        }
      }),
    )
    onDone(true)
  }

  return (
    <FormPage title={t('share.receivedTitle')} subtitle={t('share.receivedCount', { count: program.workouts.length })} onBack={() => onDone(false)}>
      <p className="hint">{t('share.receivedHint')}</p>

      {program.workouts.map((workout, index) => (
        <div className="card stack" key={index}>
          <div>
            <div className="shared-name">{workout.name}</div>
            <p className="hint" style={{ marginTop: 4 }}>
              {workout.exercises.length} {t('unit.exercise')}
              {workout.weekdays.length ? ` · ${workout.weekdays.map((day) => t(`weekday.${day}` as TranslationKey)).join(', ')}` : ''}
            </p>
            {workout.objective ? <p className="hint">{t('wizard.target.label', { target: workout.objective })}</p> : null}
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {workout.exercises.map((entry, entryIndex) => (
              <div className="shared-exercise" key={entryIndex}>
                <span className="name">{nameOf(entry.exerciseId)}</span>
                <span className="target">
                  {entry.sets} × {entry.reps}
                  {entry.restSec ? ` · ${formatRestTime(entry.restSec)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button type="button" className="btn" onClick={accept}>
        <IconCheck size={18} />
        {program.workouts.length > 1 ? t('share.accept.program', { count: program.workouts.length }) : t('share.accept.single')}
      </button>
      <button type="button" className="btn secondary" onClick={() => onDone(false)}>
        {t('share.decline')}
      </button>
    </FormPage>
  )
}
