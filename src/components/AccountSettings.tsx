import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { useAuth } from '../state/AuthContext'
import { useSync } from '../state/SyncContext'
import { Sheet } from './Sheet'

/** Compte connecté, état de la synchronisation et déconnexion. */
export function AccountSettings() {
  const { t, resetAll } = useApp()
  const { user, signOut } = useAuth()
  const { status, flush, syncNow } = useSync()
  const [confirming, setConfirming] = useState(false)
  const [flushFailed, setFlushFailed] = useState(false)

  const doSignOut = async () => {
    if (!flushFailed && !(await flush())) {
      setFlushFailed(true)
      return
    }
    await signOut()
    resetAll()
    setConfirming(false)
    setFlushFailed(false)
  }

  return (
    <div className="card">
      <div className="card-title">{t('settings.accountTitle')}</div>
      <p className="hint">{t('settings.signedInAs', { email: user?.email ?? '' })}</p>
      <p className={`hint${status === 'error' ? ' danger' : ''}`}>{t(`settings.syncStatus.${status}`)}</p>
      <div className="stack" style={{ marginTop: 12 }}>
        <button type="button" className="btn secondary" disabled={status === 'syncing'} onClick={() => void syncNow()}>
          {t('settings.syncNow')}
        </button>
        <button type="button" className="btn danger" onClick={() => setConfirming(true)}>
          {t('settings.signOut')}
        </button>
      </div>

      {confirming ? (
        <Sheet
          title={t('settings.signOut')}
          onClose={() => {
            setConfirming(false)
            setFlushFailed(false)
          }}
        >
          <div className="stack">
            <p className="hint">{t('settings.signOutBody')}</p>
            {flushFailed ? <p className="hint danger">{t('settings.signOutWarn')}</p> : null}
            <button type="button" className="btn danger" onClick={() => void doSignOut()}>
              {flushFailed ? t('settings.signOutForce') : t('settings.signOut')}
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  )
}
