import { IconDumbbell, IconHeart } from './icons'

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
  /** Au moins un exercice hors cardio dans une séance de ce jour-là. */
  strength: boolean
  /** Au moins un exercice cardio dans une séance de ce jour-là. */
  cardio: boolean
  /** Lettres des jours de programme planifiés ce jour-là (3 maximum). */
  letters: DayLetter[]
  onSelect: (date: string) => void
}

export function CalendarDay({
  date,
  dayNumber,
  outside,
  selected,
  isToday,
  trained,
  strength,
  cardio,
  letters,
  onSelect,
}: CalendarDayProps) {
  const classes = [
    'calendar-day',
    outside ? 'outside' : '',
    isToday ? 'today' : '',
    trained ? 'trained' : '',
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
      {strength || cardio ? (
        <span className="day-types">
          {strength ? (
            <span className="day-type-icon strength">
              <IconDumbbell size={11} />
            </span>
          ) : null}
          {cardio ? (
            <span className="day-type-icon cardio">
              <IconHeart size={11} />
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  )
}
