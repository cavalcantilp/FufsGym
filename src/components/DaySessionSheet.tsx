import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { IconTrash } from './icons'
import { formatLong } from '../lib/date'
import { exerciseName } from '../lib/exercises'
import { sessionSetCount, sessionVolume, round1 } from '../lib/stats'
import type { Session } from '../lib/types'

interface DaySessionSheetProps {
  date: string
  sessions: Session[]
  onClose: () => void
}

/** Détail en lecture des séances d'un jour, ouvert depuis le calendrier. */
export function DaySessionSheet({ date, sessions, onClose }: DaySessionSheetProps) {
  const { t, lang, exerciseById, deleteSession } = useApp()

  return (
    <Sheet title={formatLong(date, lang)} onClose={onClose}>
      <div className="stack">
        {sessions.length === 0 ? (
          <p className="empty">{t('day.session.empty')}</p>
        ) : (
          sessions.map((session) => (
            <div className="card" key={session.id}>
              <div className="plan-card-head">
                <span className="name">{session.dayName ?? t('day.session.freeSession')}</span>
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
