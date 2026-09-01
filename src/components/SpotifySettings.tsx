import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { useSpotify } from '../state/SpotifyContext'
import { IconSpotifyLogo } from './icons'

/** Configuration Spotify (Client ID, connexion/déconnexion) : tout vit dans Réglages. */
export function SpotifySettings() {
  const { t } = useApp()
  const { clientId, setClientId, connected, connecting, error, redirectUri, connect, disconnect } = useSpotify()
  const [clientIdDraft, setClientIdDraft] = useState(clientId)

  return (
    <div className="card">
      <div className="card-title spotify-settings-title">
        <IconSpotifyLogo size={16} />
        Spotify
      </div>
      <p className="hint">{t('train.spotifySetupHint')}</p>
      <code className="code-block">{redirectUri}</code>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="spotify-client-id">{t('train.spotifyClientIdLabel')}</label>
        <input
          id="spotify-client-id"
          type="text"
          value={clientIdDraft}
          onChange={(event) => setClientIdDraft(event.target.value)}
          placeholder={t('train.spotifyClientIdPlaceholder')}
        />
      </div>
      <div className="stack" style={{ marginTop: 12 }}>
        {clientIdDraft.trim() !== clientId ? (
          <button type="button" className="btn secondary" onClick={() => setClientId(clientIdDraft.trim())}>
            {t('train.spotifyClientIdSave')}
          </button>
        ) : null}
        {connected ? (
          <button type="button" className="btn danger" onClick={disconnect}>
            {t('train.spotifyDisconnect')}
          </button>
        ) : clientId ? (
          <button type="button" className="btn" disabled={connecting} onClick={() => void connect()}>
            {connecting ? t('train.spotifyConnecting') : t('train.spotifyConnect')}
          </button>
        ) : null}
      </div>
      {error === 'auth_failed' ? <p className="hint danger">{t('train.spotifyAuthFailed')}</p> : null}
    </div>
  )
}
