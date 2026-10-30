import type { ReactNode } from 'react'
import { useApp } from '../state/AppContext'
import { useAuth } from '../state/AuthContext'
import { useSync } from '../state/SyncContext'
import { AuthScreen } from '../pages/AuthScreen'
import { Logo } from './icons'

/** Affiche l'appli seulement une fois connecté et la première synchronisation terminée. */
export function SyncGate({ children }: { children: ReactNode }) {
  const { t } = useApp()
  const { user, loading } = useAuth()
  const { ready, conflict, resolveConflict } = useSync()

  if (loading) return <div className="onboarding auth-screen" />
  if (!user) return <AuthScreen />

  if (!ready) {
    return (
      <div className="onboarding auth-screen">
        <div className="brand">
          <Logo />
          <span className="app-name">{t('app.name')}</span>
          <p>{t('auth.syncing')}</p>
        </div>
      </div>
    )
  }

  if (conflict) {
    return (
      <div className="onboarding auth-screen">
        <div className="brand">
          <Logo />
          <h1>{t('sync.conflictTitle')}</h1>
          <p>{t('sync.conflictBody')}</p>
        </div>
        <div className="stack">
          <button type="button" className="btn" onClick={() => void resolveConflict('cloud')}>
            {t('sync.keepCloud')}
          </button>
          <button type="button" className="btn secondary" onClick={() => void resolveConflict('device')}>
            {t('sync.keepDevice')}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
