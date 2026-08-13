import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from './Sheet'

interface TextPromptSheetProps {
  title: string
  label: string
  initial?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onClose: () => void
}

/** Petite feuille à un seul champ texte : création/renommage de programme ou de jour. */
export function TextPromptSheet({ title, label, initial = '', confirmLabel, onConfirm, onClose }: TextPromptSheetProps) {
  const { t } = useApp()
  const [value, setValue] = useState(initial)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onConfirm(trimmed)
    onClose()
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label htmlFor="text-prompt-input">{label}</label>
          <input
            id="text-prompt-input"
            type="text"
            value={value}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
          />
        </div>
        <button type="button" className="btn" onClick={submit} disabled={!value.trim()}>
          {confirmLabel ?? t('prompt.save')}
        </button>
      </div>
    </Sheet>
  )
}
