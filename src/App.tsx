import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useApp } from './state/AppContext'
import { Onboarding } from './pages/Onboarding'
import { CalendarScreen } from './pages/CalendarScreen'
import { PlanificationScreen } from './pages/PlanificationScreen'
import { TrainScreen } from './pages/TrainScreen'
import { ProgressionScreen } from './pages/ProgressionScreen'
import { SettingsScreen } from './pages/SettingsScreen'
import { IconCalendar, IconClipboard, IconDumbbell, IconSettings, IconTrendingUp } from './components/icons'
import { RestTimerHost } from './components/RestTimerHost'
import { CoachChat } from './components/CoachChat'
import { load, save, STORAGE_KEYS } from './lib/storage'
import { SharedProgramScreen } from './pages/SharedProgramScreen'
import { capturePendingShare, clearPendingShare, readPendingShare } from './lib/share'

type Tab = 'calendar' | 'plan' | 'train' | 'progress' | 'settings'

export function App() {
  const { t, onboarded } = useApp()
  const [tab, setTab] = useState<Tab>(() => load(STORAGE_KEYS.ui, { tab: 'train' as Tab }).tab)

  const [sharedToken, setSharedToken] = useState<string | null>(readPendingShare)
  const [sharedToast, setSharedToast] = useState(false)

  // Lien de partage ouvert alors que l'appli tourne déjà (même onglet ou appli installée).
  useEffect(() => {
    const onHash = () => {
      capturePendingShare()
      setSharedToken(readPendingShare())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

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
    { id: 'train', label: t('nav.train'), icon: <IconDumbbell size={26} /> },
    { id: 'progress', label: t('nav.progress'), icon: <IconTrendingUp /> },
    { id: 'settings', label: t('header.settings'), icon: <IconSettings /> },
  ]

  return (
    <div className="app">
      <header className="app-header" />

      <RestTimerHost />

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

      {sharedToken ? (
        <SharedProgramScreen
          token={sharedToken}
          onDone={(accepted) => {
            clearPendingShare()
            setSharedToken(null)
            if (accepted) {
              setTab('plan')
              setSharedToast(true)
              setTimeout(() => setSharedToast(false), 2500)
            }
          }}
        />
      ) : (
        <>
          {tab === 'calendar' ? <CalendarScreen /> : null}
          {tab === 'plan' ? <PlanificationScreen /> : null}
          {tab === 'train' ? <TrainScreen /> : null}
          {tab === 'progress' ? <ProgressionScreen /> : null}
          {tab === 'settings' ? <SettingsScreen /> : null}
        </>
      )}
      {sharedToast ? <div className="toast">{t('share.added')}</div> : null}

      {sharedToken ? null : <CoachChat />}

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
            onClick={() => setTab(entry.id)}
            aria-current={tab === entry.id ? 'page' : undefined}
          >
            {entry.id === 'train' ? <span className="icon-wrap">{entry.icon}</span> : entry.icon}
            {entry.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
