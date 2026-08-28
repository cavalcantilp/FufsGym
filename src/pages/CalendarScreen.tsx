import { useMemo, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { CalendarDay } from '../components/CalendarDay'
import { DaySessionSheet } from '../components/DaySessionSheet'
import { IconChevronLeft, IconChevronRight, IconFlame } from '../components/icons'
import { fromKey, localeOf, toKey, todayKey } from '../lib/date'
import { LETTER_COLOR, schedulesForDate } from '../lib/schedule'
import { trainingStreak } from '../lib/stats'
import type { Session } from '../lib/types'

function startOfGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const weekday = (first.getDay() + 6) % 7
  first.setDate(first.getDate() - weekday)
  return first
}

export function CalendarScreen() {
  const { t, lang, sessions, schedules, workouts, exerciseById, dayNotes } = useApp()
  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const current = fromKey(today)
    return { year: current.getFullYear(), month: current.getMonth() }
  })
  const [opened, setOpened] = useState<string | null>(null)

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>()
    sessions.forEach((session) => {
      const list = map.get(session.date)
      if (list) list.push(session)
      else map.set(session.date, [session])
    })
    return map
  }, [sessions])

  /** Type(s) entraînés par jour, dans l'ordre chronologique réel (séances triées par heure de départ). */
  const dayTypesByDate = useMemo(() => {
    const map = new Map<string, ('strength' | 'cardio')[]>()
    sessionsByDate.forEach((daySessions, date) => {
      const sorted = [...daySessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      const order: ('strength' | 'cardio')[] = []
      for (const session of sorted) {
        for (const entry of session.exercises) {
          const info = exerciseById(entry.exerciseId)
          if (!info) continue
          const type = info.muscle === 'cardio' ? 'cardio' : 'strength'
          if (!order.includes(type)) order.push(type)
        }
        if (order.length === 2) break
      }
      map.set(date, order)
    })
    return map
  }, [sessionsByDate, exerciseById])

  const streak = useMemo(() => trainingStreak(sessions, today), [sessions, today])

  const { days, weeks } = useMemo(() => {
    const start = startOfGrid(cursor.year, cursor.month)
    const lead = Math.round((new Date(cursor.year, cursor.month, 1).getTime() - start.getTime()) / 86400000)
    const length = Math.ceil((lead + new Date(cursor.year, cursor.month + 1, 0).getDate()) / 7)
    return {
      weeks: length,
      days: Array.from({ length: length * 7 }, (_, index) => {
        const day = new Date(start)
        day.setDate(start.getDate() + index)
        return day
      }),
    }
  }, [cursor])

  const locale = localeOf(lang)
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })

  const weekdays = useMemo(() => {
    const reference = startOfGrid(2024, 0)
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(reference)
      day.setDate(reference.getDate() + index)
      return day.toLocaleDateString(locale, { weekday: 'narrow' })
    })
  }, [locale])

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const moved = new Date(current.year, current.month + delta, 1)
      return { year: moved.getFullYear(), month: moved.getMonth() }
    })
  }

  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    swipe.current = { x: touch.clientX, y: touch.clientY }
  }
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    shiftMonth(dx < 0 ? 1 : -1)
  }

  return (
    <div className="screen calendar-screen">
      <div className="day-nav">
        <button type="button" className="arrow" onClick={() => shiftMonth(-1)} aria-label={monthLabel}>
          <IconChevronLeft />
        </button>
        <div className="label" style={{ textTransform: 'capitalize' }}>
          {monthLabel}
        </div>
        <button type="button" className="arrow" onClick={() => shiftMonth(1)} aria-label={monthLabel}>
          <IconChevronRight />
        </button>
      </div>

      <div className="calendar" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="calendar-weekdays">
          {weekdays.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>

        <div className="calendar-grid" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const key = toKey(day)
            const daySessions = sessionsByDate.get(key)
            const dayTypes = dayTypesByDate.get(key)
            /**
             * Pour un jour passé, la lettre ne reste affichée que si
             * l'entraînement prévu a bien été réalisé ce jour-là (une séance
             * terminée pour ce workoutId) — sinon elle disparaît une fois le
             * jour écoulé. Aujourd'hui et les jours à venir gardent toujours
             * leur lettre, le jour n'étant pas encore joué.
             */
            const letters = schedulesForDate(schedules, key)
              .filter((schedule) => workouts.some((w) => w.id === schedule.workoutId))
              .filter(
                (schedule) =>
                  key >= today || (daySessions ?? []).some((s) => s.finishedAt && s.workoutId === schedule.workoutId),
              )
              .map((schedule) => ({
                letter: schedule.letter,
                color: LETTER_COLOR[schedule.letter],
              }))

            return (
              <CalendarDay
                key={key}
                date={key}
                dayNumber={day.getDate()}
                outside={day.getMonth() !== cursor.month}
                selected={key === opened}
                isToday={key === today}
                trained={Boolean(daySessions?.length)}
                dayTypes={dayTypes ?? []}
                letters={letters}
                hasNote={Boolean(dayNotes[key]?.trim())}
                onSelect={setOpened}
              />
            )
          })}
        </div>
      </div>

      <div className="calendar-footer">
        <span className="streak" aria-label={`${streak} ${t('calendar.streak')}`}>
          <IconFlame size={14} />
          <strong>{streak}</strong>
          <span className="streak-label">{t('calendar.streak')}</span>
        </span>
        <button type="button" className="today-btn" onClick={() => setOpened(today)}>
          {t('calendar.today')}
        </button>
      </div>

      {opened ? (
        <DaySessionSheet date={opened} sessions={sessionsByDate.get(opened) ?? []} onClose={() => setOpened(null)} />
      ) : null}
    </div>
  )
}
