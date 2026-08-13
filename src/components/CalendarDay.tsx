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
    </button>
  )
}
