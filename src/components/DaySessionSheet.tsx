import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { IconChevronDown, IconTrash } from './icons'
import { formatLong } from '../lib/date'
import { exerciseName } from '../lib/exercises'
import { LETTER_COLOR, schedulesForDate } from '../lib/schedule'
import { sessionSetCount, sessionVolume, round1 } from '../lib/stats'
import type { DaySchedule, Session, Workout } from '../lib/types'

interface DaySessionSheetProps {
  date: string
  sessions: Session[]
  onClose: () => void
}

/** Détail en lecture d'un jour, ouvert depuis le calendrier : entraînement prévu, puis séances déjà journalisées. */
export function DaySessionSheet({ date, sessions, onClose }: DaySessionSheetProps) {
  const { t, lang, workouts, schedules, exerciseById, deleteSession } = useApp()
  const [expanded, setExpanded] = useState<string | null>(null)

  const planned = schedulesForDate(schedules, date)
    .map((schedule) => {
      const workout = workouts.find((w) => w.id === schedule.workoutId)
      return workout ? { schedule, workout } : null
    })
    .filter((entry): entry is { schedule: DaySchedule; workout: Workout } => entry !== null)

  return (
    <Sheet title={formatLong(date, lang)} onClose={onClose}>
      <div className="stack">
        {planned.map(({ schedule, workout }) => {
          const isOpen = expanded === schedule.id
          return (
            <div className="card" key={schedule.id}>
              <div className="plan-card-head">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="letter-badge" style={{ background: LETTER_COLOR[schedule.letter] }}>
                    {schedule.letter}
                  </span>
                  <span className="name">{workout.name}</span>
                </span>
              </div>

              <div className="disclosure">
                <button
                  type="button"
                  className="disclosure-head"
                  onClick={() => setExpanded(isOpen ? null : schedule.id)}
                >
                  {t('day.session.planDetails')}
                  <IconChevronDown open={isOpen} />
                </button>
                {isOpen ? (
                  <div className="disclosure-body">
                    {workout.exercises.length === 0 ? (
                      <p className="empty">{t('workout.noExercises')}</p>
                    ) : (
                      workout.exercises.map((entry) => {
                        const info = exerciseById(entry.exerciseId)
                        return (
                          <div className="plan-exercise-row" key={entry.id} style={{ padding: '10px 0' }}>
                            <span className="info">
                              <span className="name">{info ? exerciseName(info, t) : ''}</span>
                              <span className="target">
                                {entry.sets} × {entry.reps}
                                {entry.note ? ` · ${entry.note}` : ''}
                              </span>
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}

        {sessions.length === 0 ? (
          planned.length === 0 ? <p className="empty">{t('day.session.empty')}</p> : null
        ) : (
          sessions.map((session) => (
            <div className="card" key={session.id}>
              <div className="plan-card-head">
                <span className="name">{session.workoutName ?? t('day.session.freeSession')}</span>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => deleteSession(session.id)}
                  aria-label={t('day.session.deleteAria')}
                >
                  <IconTrash />
                </button>
              </div>
              <div className="stat-row">
                <div className="stat">
                  <div className="label">{t('day.session.exercises')}</div>
                  <div className="value">{session.exercises.length}</div>
                </div>
                <div className="stat">
                  <div className="label">{t('day.session.sets')}</div>
                  <div className="value">{sessionSetCount(session)}</div>
                </div>
                <div className="stat">
                  <div className="label">{t('day.session.volume')}</div>
                  <div className="value accent">{round1(sessionVolume(session))} kg</div>
                </div>
              </div>
              <div className="disclosure-body">
                {session.exercises.map((exercise) => {
                  const info = exerciseById(exercise.exerciseId)
                  const doneSets = exercise.sets.filter((set) => set.done)
                  if (!doneSets.length) return null
                  return (
                    <div className="day-session-card" key={exercise.id}>
                      <span style={{ flex: 1 }}>{info ? exerciseName(info, t) : ''}</span>
                      <span className="hint">
                        {doneSets.map((set) => `${set.weight}kg×${set.reps}`).join(', ')}
                      </span>
                    </div>
                  )
                })}
              </div>
              {!session.finishedAt ? <p className="hint">{t('day.session.unfinished')}</p> : null}
            </div>
          ))
        )}
      </div>
    </Sheet>
  )
}
