import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { Sheet } from '../components/Sheet'
import { SpotifySettings } from '../components/SpotifySettings'
import { LANGS } from '../i18n/translations'
import type { Lang, LengthUnit, WeightUnit } from '../lib/types'

export function SettingsScreen() {
  const { t, lang, setLang, units, updateUnits, resetAll, exportData, importData } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)
  const [pendingImport, setPendingImport] = useState<unknown>(null)
  const [importInvalid, setImportInvalid] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        setPendingImport(JSON.parse(reader.result as string))
      } catch {
        setImportInvalid(true)
      }
    }
    reader.readAsText(file)
  }

  const confirmImport = () => {
    const ok = importData(pendingImport)
    setPendingImport(null)
    if (ok) setImportSuccess(true)
    else setImportInvalid(true)
  }

  useEffect(() => {
    if (!importSuccess) return
    const timeout = setTimeout(() => setImportSuccess(false), 1800)
    return () => clearTimeout(timeout)
  }, [importSuccess])

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

      <SpotifySettings />

      <div className="card">
        <div className="card-title">{t('settings.dataTitle')}</div>
        <p className="hint">{t('settings.dataHint')}</p>
        <div className="stack" style={{ marginTop: 12 }}>
          <button type="button" className="btn secondary" onClick={exportData}>
            {t('settings.export')}
          </button>
          <button type="button" className="btn secondary" onClick={() => fileInputRef.current?.click()}>
            {t('settings.import')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button type="button" className="btn danger" onClick={() => setConfirmReset(true)}>
            {t('settings.resetAll')}
          </button>
        </div>
      </div>

      {pendingImport ? (
        <Sheet title={t('settings.importConfirmTitle')} onClose={() => setPendingImport(null)}>
          <div className="stack">
            <p className="hint">{t('settings.importConfirmBody')}</p>
            <button type="button" className="btn danger" onClick={confirmImport}>
              {t('settings.importConfirm')}
            </button>
          </div>
        </Sheet>
      ) : null}

      {importInvalid ? (
        <Sheet title={t('settings.import')} onClose={() => setImportInvalid(false)}>
          <p className="hint">{t('settings.importInvalid')}</p>
        </Sheet>
      ) : null}

      {importSuccess ? <div className="toast">{t('settings.importSuccess')}</div> : null}

      {confirmReset ? (
        <Sheet title={t('settings.resetAll')} onClose={() => setConfirmReset(false)}>
          <div className="stack">
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
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
