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
import type { Lang } from './lib/types'

type Tab = 'calendar' | 'plan' | 'train' | 'progress'

export function App() {
  const { t, lang, setLang, onboarded, resetAll } = useApp()
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'calendar', label: t('nav.calendar'), icon: <IconCalendar /> },
    { id: 'plan', label: t('nav.plan'), icon: <IconClipboard /> },
    { id: 'train', label: t('nav.train'), icon: <IconDumbbell /> },
    { id: 'progress', label: t('nav.progress'), icon: <IconTrendingUp /> },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>{t('app.name')}</h1>
          <span className="subtitle">{t('app.tagline')}</span>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="help-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('header.settings')}
          >
            <IconSettings size={16} />
          </button>
        </div>
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
            className={tab === entry.id ? 'active' : ''}
            onClick={() => setTab(entry.id)}
            aria-current={tab === entry.id ? 'page' : undefined}
          >
            {entry.icon}
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
