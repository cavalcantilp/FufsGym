import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { FormPage } from '../components/FormPage'
import { DatePickerSheet } from '../components/DatePickerSheet'
import { WeekdayPicker } from '../components/WeekdayPicker'
import { IconTrash } from '../components/icons'
import { countByWeekday, LETTER_COLOR, MAX_PER_DAY } from '../lib/schedule'
import { formatShort } from '../lib/date'
import type { Plan, Weekday } from '../lib/types'

interface ScheduleScreenProps {
  plan: Plan
  onBack: () => void
}

export function ScheduleScreen({ plan, onBack }: ScheduleScreenProps) {
  const { t, lang, schedules, schedulesForPlan, scheduleForDay, addSchedule, updateSchedule, removeSchedule } =
    useApp()

  const planSchedules = schedulesForPlan(plan.id)
  const [startDate, setStartDate] = useState<string | null>(planSchedules[0]?.startDate ?? null)
  const [endDate, setEndDate] = useState<string | null>(planSchedules[0]?.endDate ?? null)
  const [pickingStart, setPickingStart] = useState(false)
  const [pickingEnd, setPickingEnd] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  const applyDates = (patch: { startDate?: string | null; endDate?: string | null }) => {
    if ('startDate' in patch) setStartDate(patch.startDate ?? null)
    if ('endDate' in patch) setEndDate(patch.endDate ?? null)
    schedulesForPlan(plan.id).forEach((schedule) =>
      updateSchedule(schedule.id, {
        startDate: (patch.startDate ?? startDate) ?? undefined,
        endDate: (patch.endDate ?? endDate) ?? undefined,
      }),
    )
  }

  const toggleWeekday = (dayId: string, weekday: Weekday) => {
    const existing = scheduleForDay(dayId)

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
    const created = addSchedule(plan.id, dayId)
    if (!created) {
      setWarning(t('schedule.noLettersLeft'))
      return
    }
    updateSchedule(created.id, {
      weekdays: [weekday],
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
    })
  }

  return (
    <FormPage title={t('schedule.title')} subtitle={plan.name} onBack={onBack}>
      <div className="stack">
        <p className="hint">{t('schedule.intro')}</p>

        <div className="card">
          <div className="card-title">{t('schedule.dateRange')}</div>
          <div className="grid-2">
            <button type="button" className="btn secondary" onClick={() => setPickingStart(true)}>
              {startDate ? formatShort(startDate, lang) : t('schedule.startDate')}
            </button>
            <button type="button" className="btn secondary" onClick={() => setPickingEnd(true)}>
              {endDate ? formatShort(endDate, lang) : t('schedule.endDate')}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>{t('schedule.dateRangeHint')}</p>
        </div>

        {warning ? <p className="notice">{warning}</p> : null}

        {plan.days.length === 0 ? (
          <p className="empty">{t('day.noExercises')}</p>
        ) : (
          plan.days.map((day) => {
            const schedule = scheduleForDay(day.id)
            return (
              <div className="day-card" key={day.id}>
                <div className="day-card-head">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {schedule ? (
                      <span className="letter-badge" style={{ background: LETTER_COLOR[schedule.letter] }}>
                        {schedule.letter}
                      </span>
                    ) : null}
                    <span className="name">{day.name}</span>
                  </span>
                  {schedule ? (
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => removeSchedule(schedule.id)}
                      aria-label={t('schedule.removeDay')}
                    >
                      <IconTrash size={15} />
                    </button>
                  ) : null}
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <WeekdayPicker
                    value={schedule?.weekdays ?? []}
                    onToggle={(weekday) => toggleWeekday(day.id, weekday)}
                    isDisabled={(weekday) =>
                      countByWeekday(schedules, weekday, schedule?.id) >= MAX_PER_DAY
                    }
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      {pickingStart ? (
        <DatePickerSheet
          title={t('schedule.startDate')}
          value={startDate}
          onPick={(date) => applyDates({ startDate: date })}
          onClose={() => setPickingStart(false)}
        />
      ) : null}

      {pickingEnd ? (
        <DatePickerSheet
          title={t('schedule.endDate')}
          value={endDate}
          onPick={(date) => applyDates({ endDate: date })}
          onClose={() => setPickingEnd(false)}
        />
      ) : null}
    </FormPage>
  )
}
