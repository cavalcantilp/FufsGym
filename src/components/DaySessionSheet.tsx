import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { MuscleDiagram } from './MuscleDiagram'
import { IconCheck, IconChevronDown, IconTrash } from './icons'
import { formatLong, formatNumeric } from '../lib/date'
import { exerciseName } from '../lib/exercises'
import { LETTER_COLOR, schedulesForDate } from '../lib/schedule'
import { sessionSetCount, sessionVolume } from '../lib/stats'
import { displayWeightValue } from '../lib/weightUnit'
import { computeMuscleLoad } from '../lib/muscleLoad'
import { HEAT_STOPS, NEUTRAL_MUSCLE_COLOR, interpolateColor } from '../lib/colorScale'
import type { DaySchedule, Session, Workout } from '../lib/types'

interface DaySessionSheetProps {
  date: string
  sessions: Session[]
  onClose: () => void
}

/** Détail en lecture d'un jour, ouvert depuis le calendrier : entraînement prévu, puis séances déjà journalisées. */
export function DaySessionSheet({ date, sessions, onClose }: DaySessionSheetProps) {
  const { t, lang, units, workouts, schedules, exerciseById, deleteSession, dayNotes, setDayNote } = useApp()
  const [expanded, setExpanded] = useState<string | null>(null)
  const savedNote = dayNotes[date] ?? ''
  const [noteDraft, setNoteDraft] = useState(savedNote)
  const noteDirty = noteDraft.trim() !== savedNote

  const planned = schedulesForDate(schedules, date)
    .map((schedule) => {
      const workout = workouts.find((w) => w.id === schedule.workoutId)
      return workout ? { schedule, workout } : null
    })
    .filter((entry): entry is { schedule: DaySchedule; workout: Workout } => entry !== null)

  const { byMuscle } = useMemo(() => computeMuscleLoad(sessions, date, date, 'sets'), [sessions, date])
  const maxLoad = useMemo(() => Object.values(byMuscle).reduce((max, v) => Math.max(max, v), 0), [byMuscle])
  const colorForMuscle = (muscleId: string) => {
    const value = byMuscle[muscleId] ?? 0
    return value > 0 ? interpolateColor(HEAT_STOPS, value / maxLoad) : NEUTRAL_MUSCLE_COLOR
  }

  return (
    <Sheet title={formatLong(date, lang)} onClose={onClose}>
      <div className="stack">
        <div className="card">
          <div className="field">
            <label htmlFor="day-note">{t('day.session.noteLabel')}</label>
            <textarea
              id="day-note"
              rows={3}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder={t('day.session.notePlaceholder')}
            />
          </div>
          {noteDirty ? (
            <button
              type="button"
              className="btn"
              style={{ marginTop: 10 }}
              onClick={() => setDayNote(date, noteDraft.trim())}
            >
              <IconCheck size={16} />
              {t('day.session.noteSave')}
            </button>
          ) : null}
        </div>

        {maxLoad > 0 ? (
          <div className="card">
            <div className="card-title">
              {t('day.session.musclesTitle', { date: formatNumeric(date, lang) })}
            </div>
            <MuscleDiagram colorFor={colorForMuscle} />
            <div className="legend">
              <span className="legend-label">{t('muscleMap.legendLow')}</span>
              <span className="legend-bar heat" />
              <span className="legend-label">{t('muscleMap.legendHigh')}</span>
            </div>
          </div>
        ) : null}

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
                                {info?.muscle === 'cardio' ? entry.reps : `${entry.sets} × ${entry.reps}`}
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
                  <div className="value accent">
                    {displayWeightValue(sessionVolume(session), units.weight)} {units.weight}
                  </div>
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
                        {doneSets
                          .map((set) => `${displayWeightValue(set.weight, units.weight)}${units.weight}×${set.reps}`)
                          .join(', ')}
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
