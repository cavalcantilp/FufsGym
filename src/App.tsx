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
import { load, save, STORAGE_KEYS } from './lib/storage'

type Tab = 'calendar' | 'plan' | 'train' | 'progress'

export function App() {
  const { onboarded, resetAll } = useApp()
  const [tab, setTab] = useState<Tab>(() => load(STORAGE_KEYS.ui, { tab: 'train' as Tab }).tab)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  useEffect(() => {
    save(STORAGE_KEYS.ui, { tab })
  }, [tab])

  useEffect(() => {
    document.title = 'FufsGym — Musculation'
  }, [])

  if (!onboarded) return <Onboarding />

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'calendar', label: 'Calendrier', icon: <IconCalendar /> },
    { id: 'plan', label: 'Planification', icon: <IconClipboard /> },
    { id: 'train', label: "S'entraîner", icon: <IconDumbbell /> },
    { id: 'progress', label: 'Progression', icon: <IconTrendingUp /> },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>FufsGym</h1>
          <span className="subtitle">Musculation</span>
        </div>
        <div className="header-actions">
          <button type="button" className="help-btn" onClick={() => setSettingsOpen(true)} aria-label="Réglages">
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
            Mise à jour disponible — appuyez pour actualiser
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
        <Sheet title="Réglages" onClose={() => setSettingsOpen(false)}>
          <div className="stack">
            {confirmReset ? (
              <>
                <p className="hint">
                  Cette action supprime définitivement vos programmes, séances et exercices personnalisés, sur cet
                  appareil.
                </p>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => {
                    resetAll()
                    setConfirmReset(false)
                    setSettingsOpen(false)
                  }}
                >
                  Confirmer la réinitialisation
                </button>
                <button type="button" className="btn secondary" onClick={() => setConfirmReset(false)}>
                  Annuler
                </button>
              </>
            ) : (
              <button type="button" className="btn danger" onClick={() => setConfirmReset(true)}>
                Réinitialiser toutes les données
              </button>
            )}
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
