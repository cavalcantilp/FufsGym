import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { useSpotify } from '../state/SpotifyContext'
import { IconChevronDown, IconPause, IconPlay, IconSkipBack, IconSkipForward } from './icons'

/**
 * Contrôle de lecture Spotify pendant une séance active. Tout vit ici (y
 * compris la configuration du Client ID) : le lecteur n'apparaît nulle part
 * ailleurs dans l'app, par choix explicite.
 */
export function SpotifyMiniPlayer() {
  const { t } = useApp()
  const { clientId, setClientId, connected, connecting, playerReady, track, error, redirectUri, connect, disconnect, togglePlay, nextTrack, previousTrack } =
    useSpotify()
  const [clientIdDraft, setClientIdDraft] = useState(clientId)
  const [setupOpen, setSetupOpen] = useState(!clientId)

  if (!connected) {
    return (
      <div className="card">
        <button type="button" className="disclosure-head" onClick={() => setSetupOpen((current) => !current)}>
          Spotify
          <IconChevronDown open={setupOpen} size={16} />
        </button>
        {setupOpen ? (
          <div className="disclosure-body stack">
            <p className="hint">{t('train.spotifySetupHint')}</p>
            <code className="code-block">{redirectUri}</code>
            <div className="field">
              <label htmlFor="spotify-client-id">{t('train.spotifyClientIdLabel')}</label>
              <input
                id="spotify-client-id"
                type="text"
                value={clientIdDraft}
                onChange={(event) => setClientIdDraft(event.target.value)}
                placeholder={t('train.spotifyClientIdPlaceholder')}
              />
            </div>
            {clientIdDraft.trim() !== clientId ? (
              <button type="button" className="btn secondary" onClick={() => setClientId(clientIdDraft.trim())}>
                {t('train.spotifyClientIdSave')}
              </button>
            ) : null}
            {clientId ? (
              <button type="button" className="btn" disabled={connecting} onClick={() => void connect()}>
                {connecting ? t('train.spotifyConnecting') : t('train.spotifyConnect')}
              </button>
            ) : null}
            {error === 'auth_failed' ? <p className="hint danger">{t('train.spotifyAuthFailed')}</p> : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="card spotify-player">
      {error === 'premium_required' ? (
        <p className="hint danger">{t('train.spotifyPremiumRequired')}</p>
      ) : error === 'generic' ? (
        <p className="hint danger">{t('train.spotifyGenericError')}</p>
      ) : null}
      <div className="spotify-now-playing">
        {track?.albumArt ? (
          <img src={track.albumArt} alt="" className="spotify-art" />
        ) : (
          <div className="spotify-art placeholder" />
        )}
        <div className="spotify-track-info">
          <span className="name">{track?.name ?? (playerReady ? t('train.spotifyNoTrack') : t('train.spotifyConnecting'))}</span>
          {track ? <span className="hint">{track.artist}</span> : null}
        </div>
      </div>
      <div className="spotify-controls">
        <button type="button" className="icon-btn" onClick={previousTrack} aria-label={t('train.spotifyPreviousAria')}>
          <IconSkipBack size={18} />
        </button>
        <button
          type="button"
          className="icon-btn accent"
          onClick={togglePlay}
          aria-label={track?.isPaused ? t('train.spotifyPlayAria') : t('train.spotifyPauseAria')}
        >
          {track && !track.isPaused ? <IconPause size={20} /> : <IconPlay size={20} />}
        </button>
        <button type="button" className="icon-btn" onClick={nextTrack} aria-label={t('train.spotifyNextAria')}>
          <IconSkipForward size={18} />
        </button>
        <button type="button" className="btn secondary spotify-disconnect" onClick={disconnect}>
          {t('train.spotifyDisconnect')}
        </button>
      </div>
    </div>
  )
}
