import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { DatePickerSheet } from '../components/DatePickerSheet'
import { WeekdayPicker } from '../components/WeekdayPicker'
import { countByWeekday, LETTER_COLOR, MAX_PER_DAY } from '../lib/schedule'
import { formatShort } from '../lib/date'
import type { Weekday, Workout } from '../lib/types'

interface ScheduleScreenProps {
  workout: Workout
  onBack: () => void
}

export function ScheduleScreen({ workout, onBack }: ScheduleScreenProps) {
  const { t, lang, schedules, scheduleForWorkout, addSchedule, updateSchedule, removeSchedule } = useApp()

  const existing = scheduleForWorkout(workout.id)
  const [pickingStart, setPickingStart] = useState(false)
  const [pickingEnd, setPickingEnd] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const toggleWeekday = (weekday: Weekday) => {
    if (existing) {
      const has = existing.weekdays.includes(weekday)
      if (has) {
        const remaining = existing.weekdays.filter((w) => w !== weekday)
        if (remaining.length === 0) removeSchedule(existing.id)
        else updateSchedule(existing.id, { weekdays: remaining })
        return
      }
      if (countByWeekday(schedules, weekday, existing.id) >= MAX_PER_DAY) {
        setWarning(t('schedule.maxPerDay', { max: MAX_PER_DAY }))
        return
      }
      updateSchedule(existing.id, { weekdays: [...existing.weekdays, weekday] })
      return
    }

    if (countByWeekday(schedules, weekday) >= MAX_PER_DAY) {
      setWarning(t('schedule.maxPerDay', { max: MAX_PER_DAY }))
      return
    }
    const created = addSchedule(workout.id)
    if (!created) {
      setWarning(t('schedule.noLettersLeft'))
      return
    }
    updateSchedule(created.id, { weekdays: [weekday] })
  }

  const applyDates = (patch: { startDate?: string | null; endDate?: string | null }) => {
    if (!existing) return
    updateSchedule(existing.id, {
      startDate: (patch.startDate !== undefined ? patch.startDate : existing.startDate) ?? undefined,
      endDate: (patch.endDate !== undefined ? patch.endDate : existing.endDate) ?? undefined,
    })
  }

  return (
    <FormPage title={t('schedule.title')} subtitle={workout.name} onBack={onBack}>
      <div className="stack">
        <p className="hint">{t('schedule.intro')}</p>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {existing ? (
              <span className="letter-badge" style={{ background: LETTER_COLOR[existing.letter] }}>
                {existing.letter}
              </span>
            ) : null}
            <span className="name">{workout.name}</span>
          </div>
          <WeekdayPicker
            value={existing?.weekdays ?? []}
            onToggle={toggleWeekday}
            isDisabled={(weekday) => countByWeekday(schedules, weekday, existing?.id) >= MAX_PER_DAY}
          />
        </div>

        {warning ? <p className="notice">{warning}</p> : null}

        {existing ? (
          <div className="card">
            <div className="card-title">{t('schedule.dateRange')}</div>
            <div className="grid-2">
              <button type="button" className="btn secondary" onClick={() => setPickingStart(true)}>
                {existing.startDate ? formatShort(existing.startDate, lang) : t('schedule.startDate')}
              </button>
              <button type="button" className="btn secondary" onClick={() => setPickingEnd(true)}>
                {existing.endDate ? formatShort(existing.endDate, lang) : t('schedule.endDate')}
              </button>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>{t('schedule.dateRangeHint')}</p>
          </div>
        ) : null}

        <button type="button" className="btn success" onClick={onBack}>
          {t('schedule.save')}
        </button>

        {existing ? (
          <button type="button" className="btn danger" onClick={() => removeSchedule(existing.id)}>
            {t('schedule.removeDay')}
          </button>
        ) : null}
      </div>

      {pickingStart && existing ? (
        <DatePickerSheet
          title={t('schedule.startDate')}
          value={existing.startDate ?? null}
          onPick={(date) => applyDates({ startDate: date })}
          onClose={() => setPickingStart(false)}
        />
      ) : null}

      {pickingEnd && existing ? (
        <DatePickerSheet
          title={t('schedule.endDate')}
          value={existing.endDate ?? null}
          onPick={(date) => applyDates({ endDate: date })}
          onClose={() => setPickingEnd(false)}
        />
      ) : null}
    </FormPage>
  )
}
