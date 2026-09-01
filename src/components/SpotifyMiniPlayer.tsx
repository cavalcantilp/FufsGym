import { useApp } from '../state/AppContext'
import { useSpotify } from '../state/SpotifyContext'
import { IconPause, IconPlay, IconSkipBack, IconSkipForward } from './icons'

/**
 * Mini-lecteur affiché pendant une séance active, une fois Spotify connecté
 * (connexion configurée dans Réglages). Ne montre rien tant qu'on n'est pas
 * connecté : pas de configuration ici, par choix explicite.
 */
export function SpotifyMiniPlayer() {
  const { t } = useApp()
  const { connected, playerReady, track, error, togglePlay, nextTrack, previousTrack } = useSpotify()

  if (!connected) return null

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
      </div>
    </div>
  )
}
