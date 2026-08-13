import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'
import { IconChevronLeft, IconChevronRight } from './icons'
import { fromKey, localeOf, toKey, todayKey } from '../lib/date'

interface DatePickerSheetProps {
  title: string
  /** Date au format YYYY-MM-DD, ou `null` si aucune borne fixée. */
  value: string | null
  onPick: (date: string | null) => void
  onClose: () => void
}

function startOfGrid(year: number, month: number): Date {
  const first = new Date(year, month, 1)
  const weekday = (first.getDay() + 6) % 7
  first.setDate(first.getDate() - weekday)
  return first
}

/** Sélecteur de date facultative, en feuille — même geste qu'un envoi programmé dans une appli de messagerie. */
export function DatePickerSheet({ title, value, onPick, onClose }: DatePickerSheetProps) {
  const { t, lang } = useApp()
  const today = todayKey()
  const [cursor, setCursor] = useState(() => {
    const current = fromKey(value ?? today)
    return { year: current.getFullYear(), month: current.getMonth() }
  })

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

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const moved = new Date(current.year, current.month + delta, 1)
      return { year: moved.getFullYear(), month: moved.getMonth() }
    })
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="stack">
        <div className="day-nav">
          <button type="button" className="arrow" onClick={() => shiftMonth(-1)} aria-label={t('datepicker.prevMonth')}>
            <IconChevronLeft />
          </button>
          <div className="label" style={{ textTransform: 'capitalize' }}>
            {monthLabel}
          </div>
          <button type="button" className="arrow" onClick={() => shiftMonth(1)} aria-label={t('datepicker.nextMonth')}>
            <IconChevronRight />
          </button>
        </div>

        <div className="calendar">
          <div className="calendar-weekdays">
            {weekdays.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
          <div className="calendar-grid" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
            {days.map((day) => {
              const key = toKey(day)
              const classes = [
                'calendar-day',
                day.getMonth() !== cursor.month ? 'outside' : '',
                key === today ? 'today' : '',
                key === value ? 'selected' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={key}
                  type="button"
                  className={classes}
                  onClick={() => {
                    onPick(key)
                    onClose()
                  }}
                >
                  <span className="num">{day.getDate()}</span>
                </button>
              )
            })}
          </div>
        </div>

        {value ? (
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              onPick(null)
              onClose()
            }}
          >
            {t('datepicker.clear')}
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}
