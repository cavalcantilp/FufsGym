import { useMemo, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { CalendarDay } from '../components/CalendarDay'
import { DaySessionSheet } from '../components/DaySessionSheet'
import { IconChevronLeft, IconChevronRight, IconFlame } from '../components/icons'
import { MUSCLE_COLOR } from '../lib/exercises'
import { fromKey, toKey, todayKey } from '../lib/date'
import { trainingStreak } from '../lib/stats'
import type { Session } from '../lib/types'

function startOfGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const weekday = (first.getDay() + 6) % 7
  first.setDate(first.getDate() - weekday)
  return first
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function CalendarScreen() {
  const { sessions, exerciseById } = useApp()
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

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

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
        <button type="button" className="arrow" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">
          <IconChevronLeft />
        </button>
        <div className="label" style={{ textTransform: 'capitalize' }}>
          {monthLabel}
        </div>
        <button type="button" className="arrow" onClick={() => shiftMonth(1)} aria-label="Mois suivant">
          <IconChevronRight />
        </button>
      </div>

      <div className="calendar" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>

        <div className="calendar-grid" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
          {days.map((day) => {
            const key = toKey(day)
            const daySessions = sessionsByDate.get(key)
            const muscles = new Set<string>()
            daySessions?.forEach((session) =>
              session.exercises.forEach((exercise) => {
                if (!exercise.sets.some((set) => set.done)) return
                const info = exerciseById(exercise.exerciseId)
                if (info) muscles.add(MUSCLE_COLOR[info.muscle])
              }),
            )

            return (
              <CalendarDay
                key={key}
                date={key}
                dayNumber={day.getDate()}
                outside={day.getMonth() !== cursor.month}
                selected={key === opened}
                isToday={key === today}
                trained={Boolean(daySessions?.length)}
                muscleDots={Array.from(muscles)}
                onSelect={setOpened}
              />
            )
          })}
        </div>
      </div>

      <div className="calendar-footer">
        <span className="streak" aria-label={`${streak} jours d'affilée`}>
          <IconFlame size={14} />
          <strong>{streak}</strong>
          <span className="streak-label">jours d'affilée</span>
        </span>
        <button type="button" className="today-btn" onClick={() => setOpened(today)}>
          Aujourd'hui
        </button>
      </div>

      {opened ? (
        <DaySessionSheet date={opened} sessions={sessionsByDate.get(opened) ?? []} onClose={() => setOpened(null)} />
      ) : null}
    </div>
  )
}
