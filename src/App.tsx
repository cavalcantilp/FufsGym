import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useApp } from './state/AppContext'
import { Onboarding } from './pages/Onboarding'
import { CalendarScreen } from './pages/CalendarScreen'
import { PlanificationScreen } from './pages/PlanificationScreen'
import { TrainScreen } from './pages/TrainScreen'
import { ProgressionScreen } from './pages/ProgressionScreen'
import { Sheet } from './components/Sheet'
import { IconCalendar, IconClipboard, IconDumbbell, IconSettings, IconTrendingUp } from './components/icons'
import { LANGS } from './i18n/translations'
import { load, save, STORAGE_KEYS } from './lib/storage'
import type { Lang, LengthUnit, WeightUnit } from './lib/types'

type Tab = 'calendar' | 'plan' | 'train' | 'progress'
type NavId = Tab | 'settings'

export function App() {
  const { t, lang, setLang, units, updateUnits, onboarded, resetAll } = useApp()
  const [tab, setTab] = useState<Tab>(() => load(STORAGE_KEYS.ui, { tab: 'train' as Tab }).tab)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  useEffect(() => {
    save(STORAGE_KEYS.ui, { tab })
  }, [tab])

  useEffect(() => {
    document.title = `${t('app.name')} — ${t('app.tagline')}`
  }, [t])

  if (!onboarded) return <Onboarding />

  const tabs: { id: NavId; label: string; icon: React.ReactNode; onSelect: () => void }[] = [
    { id: 'calendar', label: t('nav.calendar'), icon: <IconCalendar />, onSelect: () => setTab('calendar') },
    { id: 'plan', label: t('nav.plan'), icon: <IconClipboard />, onSelect: () => setTab('plan') },
    { id: 'train', label: t('nav.train'), icon: <IconDumbbell size={26} />, onSelect: () => setTab('train') },
    { id: 'progress', label: t('nav.progress'), icon: <IconTrendingUp />, onSelect: () => setTab('progress') },
    { id: 'settings', label: t('header.settings'), icon: <IconSettings />, onSelect: () => setSettingsOpen(true) },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('app.name')}</h1>
      </header>

      {needRefresh ? (
        <div style={{ padding: '0 16px' }}>
          <button
            type="button"
            className="notice info"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => void updateServiceWorker(true)}
          >
            {t('pwa.update')}
          </button>
        </div>
      ) : null}

      {tab === 'calendar' ? <CalendarScreen /> : null}
      {tab === 'plan' ? <PlanificationScreen /> : null}
      {tab === 'train' ? <TrainScreen /> : null}
      {tab === 'progress' ? <ProgressionScreen /> : null}

      <nav className="tabbar">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={[
              tab === entry.id ? 'active' : '',
              entry.id === 'train' ? 'primary' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={entry.onSelect}
            aria-current={tab === entry.id ? 'page' : undefined}
          >
            {entry.id === 'train' ? <span className="icon-wrap">{entry.icon}</span> : entry.icon}
            {entry.label}
          </button>
        ))}
      </nav>

      {settingsOpen ? (
        <Sheet title={t('settings.title')} onClose={() => setSettingsOpen(false)}>
          <div className="stack">
            <div className="field">
              <label htmlFor="settings-lang">{t('settings.language')}</label>
              <select
                id="settings-lang"
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                {LANGS.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="card-title" style={{ marginBottom: -6 }}>{t('settings.units')}</div>
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

            {confirmReset ? (
              <>
                <p className="hint">{t('settings.resetWarning')}</p>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    resetAll()
                    setConfirmReset(false)
                    setSettingsOpen(false)
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
        </Sheet>
      ) : null}
    </div>
  )
}
