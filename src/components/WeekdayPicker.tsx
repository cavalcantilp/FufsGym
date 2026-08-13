import { useApp } from '../state/AppContext'
import { WEEKDAYS } from '../lib/schedule'
import type { TranslationKey } from '../i18n/translations'
import type { Weekday } from '../lib/types'

interface WeekdayPickerProps {
  value: Weekday[]
  onToggle: (day: Weekday) => void
  /** Jour à désactiver (ex. la limite de 3 programmations serait dépassée) — reste visible, juste non cochable. */
  isDisabled?: (day: Weekday) => boolean
}

/** Sept puces Lun→Dim, à cocher — même geste que les jours de rappel d'une appli d'habitudes. */
export function WeekdayPicker({ value, onToggle, isDisabled }: WeekdayPickerProps) {
  const { t } = useApp()

  return (
    <div className="weekday-picker">
      {WEEKDAYS.map((day) => {
        const active = value.includes(day)
        const disabled = !active && (isDisabled?.(day) ?? false)
        return (
          <button
            key={day}
            type="button"
            className={`weekday-chip${active ? ' active' : ''}`}
            disabled={disabled}
            onClick={() => onToggle(day)}
          >
            {t(`weekday.${day}` as TranslationKey)}
          </button>
        )
      })}
    </div>
  )
}
