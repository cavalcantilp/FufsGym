import { IconDumbbell, IconHeart, IconStickyNote } from './icons'

interface DayLetter {
  letter: string
  color: string
}

interface CalendarDayProps {
  date: string
  dayNumber: number
  outside: boolean
  selected: boolean
  isToday: boolean
  trained: boolean
  /** Types entraînés ce jour-là, dans l'ordre chronologique réel (le premier pratiqué en premier). */
  dayTypes: ('strength' | 'cardio')[]
  /** Lettres des jours de programme planifiés ce jour-là (3 maximum). */
  letters: DayLetter[]
  /** Un commentaire libre existe pour ce jour. */
  hasNote: boolean
  onSelect: (date: string) => void
}

export function CalendarDay({
  date,
  dayNumber,
  outside,
  selected,
  isToday,
  trained,
  dayTypes,
  letters,
  hasNote,
  onSelect,
}: CalendarDayProps) {
  const classes = [
    'calendar-day',
    outside ? 'outside' : '',
    isToday ? 'today' : '',
    trained ? 'trained' : '',
    dayTypes.length === 2 ? 'mixed' : '',
    selected ? 'selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} onClick={() => onSelect(date)}>
      <span className="num">{dayNumber}</span>
      {letters.length ? (
        <span className="day-letters">
          {letters.map((entry, index) => (
            <span key={index} className="letter-badge small" style={{ background: entry.color }}>
              {entry.letter}
            </span>
          ))}
        </span>
      ) : null}
      {dayTypes.length ? (
        <span className="day-types">
          {dayTypes.map((type) => (
            <span key={type} className={`day-type-icon ${type}`}>
              {type === 'strength' ? <IconDumbbell size={14} /> : <IconHeart size={14} />}
            </span>
          ))}
        </span>
      ) : null}
      {hasNote ? (
        <span className="day-note-icon">
          <IconStickyNote size={12} />
        </span>
      ) : null}
    </button>
  )
}
