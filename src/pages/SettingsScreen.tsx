import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { LANGS } from '../i18n/translations'
import type { Lang, LengthUnit, WeightUnit } from '../lib/types'

export function SettingsScreen() {
  const { t, lang, setLang, units, updateUnits, resetAll } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="screen">
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('settings.title')}</h2>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="settings-lang">{t('settings.language')}</label>
          <select id="settings-lang" value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
            {LANGS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="card-title">{t('settings.units')}</div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="settings-unit-weight">{t('settings.weightUnit')}</label>
            <select
              id="settings-unit-weight"
              value={units.weight}
              onChange={(event) => updateUnits({ weight: event.target.value as WeightUnit })}
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="settings-unit-length">{t('settings.lengthUnit')}</label>
            <select
              id="settings-unit-length"
              value={units.length}
              onChange={(event) => updateUnits({ length: event.target.value as LengthUnit })}
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>
      </div>

      <div className="stack">
        {confirmReset ? (
          <>
            <p className="hint">{t('settings.resetWarning')}</p>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                resetAll()
                setConfirmReset(false)
              }}
            >
              {t('settings.resetConfirm')}
            </button>
            <button type="button" className="btn secondary" onClick={() => setConfirmReset(false)}>
              {t('settings.cancel')}
            </button>
          </>
        ) : (
          <button type="button" className="btn danger" onClick={() => setConfirmReset(true)}>
            {t('settings.resetAll')}
          </button>
        )}
      </div>
    </div>
  )
}
