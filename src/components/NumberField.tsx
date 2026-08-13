import { useEffect, useRef, useState } from 'react'

interface NumberFieldProps {
  id: string
  label?: string
  value: number
  onCommit: (value: number) => void
  min?: number
  max?: number
  inputMode?: 'numeric' | 'decimal'
  placeholder?: string
  allowZero?: boolean
}

/** Chiffres, avec au plus un séparateur décimal (point ou virgule). */
const ALLOWED = /^[0-9]*[.,]?[0-9]*$/

export function parseNumber(raw: string): number {
  return Number(raw.replace(',', '.'))
}

/**
 * Champ numérique dont l'affichage suit la frappe, pas la valeur du modèle.
 *
 * Un `<input type="number">` piloté par un nombre se désynchronise : React
 * compare l'ancienne et la nouvelle valeur de façon lâche, donc « 090 » et 90
 * lui paraissent identiques et le champ garde le zéro parasite à l'écran. Le
 * texte saisi est donc gardé en état local, en `type="text"` avec `inputMode`
 * pour garder le clavier numérique sur mobile — un `type="number"` refuse par
 * ailleurs la virgule, première touche décimale d'un clavier français.
 */
export function NumberField({
  id,
  label,
  value,
  onCommit,
  min = 0,
  max,
  inputMode = 'decimal',
  placeholder,
  allowZero = false,
}: NumberFieldProps) {
  const format = (n: number) => (n === 0 && allowZero ? '0' : n > 0 ? String(n) : '')

  const [draft, setDraft] = useState(() => format(value))
  const committed = useRef(value)

  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value
      setDraft(format(value))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const handleChange = (raw: string) => {
    if (!ALLOWED.test(raw)) return
    setDraft(raw)
    const parsed = parseNumber(raw)
    if (raw.trim() !== '' && Number.isFinite(parsed) && (parsed > 0 || allowZero)) {
      committed.current = parsed
      onCommit(parsed)
    }
  }

  const handleBlur = () => {
    const parsed = parseNumber(draft)
    if (draft.trim() === '' || !Number.isFinite(parsed) || (parsed <= 0 && !allowZero)) {
      setDraft(format(value))
      return
    }
    const clamped = Math.min(Math.max(parsed, min), max ?? Math.max(parsed, min))
    committed.current = clamped
    setDraft(format(clamped))
    if (clamped !== value) onCommit(clamped)
  }

  const field = (
    <input
      id={id}
      name={id}
      type="text"
      inputMode={inputMode}
      autoComplete="off"
      placeholder={placeholder}
      value={draft}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={handleBlur}
    />
  )

  if (!label) return field

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {field}
    </div>
  )
}
