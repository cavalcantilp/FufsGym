const LOCALE = 'fr-FR'

/** Date locale au format YYYY-MM-DD (pas d'UTC : le calendrier suit le fuseau de l'appareil). */
export function toKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function todayKey(): string {
  return toKey(new Date())
}

export function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function shiftDay(key: string, days: number): string {
  const date = fromKey(key)
  date.setDate(date.getDate() + days)
  return toKey(date)
}

export function daysBetween(from: string, to: string): number {
  const ms = fromKey(to).getTime() - fromKey(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function formatDay(key: string): string {
  return fromKey(key).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatShort(key: string): string {
  return fromKey(key).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit' })
}

export function formatLong(key: string): string {
  return fromKey(key).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const LOCALE_ID = LOCALE
