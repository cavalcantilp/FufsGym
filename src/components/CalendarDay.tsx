interface CalendarDayProps {
  date: string
  dayNumber: number
  outside: boolean
  selected: boolean
  isToday: boolean
  trained: boolean
  /** Couleurs des groupes musculaires travaillés ce jour-là, une puce par groupe. */
  muscleDots: string[]
  onSelect: (date: string) => void
}

export function CalendarDay({
  date,
  dayNumber,
  outside,
  selected,
  isToday,
  trained,
  muscleDots,
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
      {muscleDots.length ? (
        <span className="muscle-dots">
          {muscleDots.map((color, index) => (
            <span key={index} style={{ background: color }} />
          ))}
        </span>
      ) : null}
    </button>
  )
}
