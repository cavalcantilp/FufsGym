import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { useSpotify } from '../state/SpotifyContext'
import { IconChevronDown, IconPause, IconPlay, IconSkipBack, IconSkipForward, IconSpotifyLogo } from './icons'
import { formatRestTime } from '../lib/rest'

/** Distance de glissement (px) à partir de laquelle un swipe change de piste. */
const SWIPE_THRESHOLD = 40

/**
 * Mini-lecteur affiché pendant une séance active, une fois Spotify connecté
 * (connexion configurée dans Réglages). Replié par défaut en barre compacte
 * (pochette, titre, lecture, suivant) ; un appui sur le titre ouvre le lecteur complet.
 */
export function SpotifyMiniPlayer() {
  const { t } = useApp()
  const { connected, switching, playerReady, track, error, togglePlay, nextTrack, previousTrack, seek } = useSpotify()
  const [open, setOpen] = useState(false)
  const [displayPosition, setDisplayPosition] = useState(0)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const swipeStartX = useRef<number | null>(null)
  const directionRef = useRef<'next' | 'prev'>('next')

  // Le SDK ne pousse pas la position en continu : on l'interpole localement entre deux
  // vrais événements `player_state_changed`, comme recommandé par Spotify.
  useEffect(() => {
    if (!track) {
      setDisplayPosition(0)
      return
    }
    const update = () => {
      const elapsed = track.isPaused ? 0 : Date.now() - track.positionUpdatedAt
      setDisplayPosition(Math.min(track.position + elapsed, track.duration))
    }
    update()
    const interval = setInterval(update, 250)
    return () => clearInterval(interval)
  }, [track])

  if (!connected) return null

  const commitSeek = () => {
    if (dragPosition !== null) seek(dragPosition)
    setDragPosition(null)
  }

  const goNext = () => {
    directionRef.current = 'next'
    nextTrack()
  }
  const goPrevious = () => {
    directionRef.current = 'prev'
    previousTrack()
  }

  const onSwipeStart = (clientX: number) => {
    swipeStartX.current = clientX
  }
  const onSwipeEnd = (clientX: number) => {
    if (swipeStartX.current === null) return
    const delta = clientX - swipeStartX.current
    swipeStartX.current = null
    if (delta > SWIPE_THRESHOLD) goPrevious()
    else if (delta < -SWIPE_THRESHOLD) goNext()
  }

  const shownPosition = dragPosition ?? displayPosition
  const ratio = track?.duration ? Math.min(1, shownPosition / track.duration) : 0
  // Pendant un changement de morceau, les commandes restent en « lecture » : seul le contenu s'estompe.
  const playing = Boolean(track && (!track.isPaused || switching))
  const title = track?.name ?? (playerReady ? t('train.spotifyNoTrack') : t('train.spotifyConnecting'))

  const art = (className: string) =>
    track?.albumArt ? <img src={track.albumArt} alt="" className={className} /> : <span className={`${className} placeholder`} />
  const equalizer = (
    <span className={`spotify-eq${playing ? ' playing' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
  const playButton = (size: number, className: string) => (
    <button
      type="button"
      className={className}
      onClick={togglePlay}
      disabled={!track}
      aria-label={playing ? t('train.spotifyPauseAria') : t('train.spotifyPlayAria')}
    >
      {playing ? <IconPause size={size} /> : <IconPlay size={size} />}
    </button>
  )

  if (!open) {
    return (
      <div className={`spotify-mini${switching ? ' switching' : ''}`}>
        {track?.albumArt ? <img src={track.albumArt} alt="" className="spotify-backdrop" aria-hidden="true" /> : null}
        <button type="button" className="spotify-mini-main" onClick={() => setOpen(true)} aria-label={t('train.spotifyExpandAria')}>
          {art('spotify-mini-art')}
          <span className="spotify-mini-text">
            <span className="name">{title}</span>
            <span className="artist">
              {equalizer}
              {track?.artist ?? 'Spotify'}
            </span>
          </span>
        </button>
        {playButton(18, 'spotify-mini-btn primary')}
        <button type="button" className="spotify-mini-btn" onClick={goNext} disabled={!track} aria-label={t('train.spotifyNextAria')}>
          <IconSkipForward size={18} />
        </button>
        <span className="spotify-mini-progress" style={{ transform: `scaleX(${ratio})` }} />
      </div>
    )
  }

  return (
    <div
      className={`spotify-player${switching ? ' switching' : ''}`}
      onPointerDown={(event) => {
        // Le curseur de position garde son propre glissement.
        if (!(event.target as HTMLElement).closest('input, button, a')) onSwipeStart(event.clientX)
      }}
      onPointerUp={(event) => onSwipeEnd(event.clientX)}
    >
      {track?.albumArt ? <img src={track.albumArt} alt="" className="spotify-backdrop" aria-hidden="true" /> : null}

      <div className="spotify-header-row">
        <a
          className="spotify-brand-header"
          href={track?.url ?? 'https://open.spotify.com'}
          target="_blank"
          rel="noreferrer"
          aria-label={t('train.spotifyOpenAria')}
        >
          <IconSpotifyLogo size={18} />
          <span>Spotify</span>
        </a>
        <button type="button" className="spotify-round-btn" onClick={() => setOpen(false)} aria-label={t('train.spotifyMinimizeAria')}>
          <IconChevronDown open size={16} />
        </button>
      </div>

      {error === 'premium_required' ? (
        <p className="hint danger">{t('train.spotifyPremiumRequired')}</p>
      ) : error === 'generic' ? (
        <p className="hint danger">{t('train.spotifyGenericError')}</p>
      ) : null}

      <div className="spotify-now">
        <div key={track?.url ?? 'none'} className={`spotify-art-wrap slide-${directionRef.current}${playing ? ' playing' : ''}`}>
          {art('spotify-art')}
        </div>
        <div className="spotify-track-info">
          <span className="name">{title}</span>
          <span className="artist">{track?.artist ?? ''}</span>
          {equalizer}
        </div>
      </div>

      <div className="spotify-seek">
        <input
          type="range"
          className="spotify-seek-input"
          style={{ '--fill': `${ratio * 100}%` } as React.CSSProperties}
          min={0}
          max={track?.duration || 0}
          step={1000}
          value={shownPosition}
          disabled={!track}
          onChange={(event) => setDragPosition(Number(event.target.value))}
          onMouseUp={commitSeek}
          onTouchEnd={commitSeek}
          aria-label={t('train.spotifySeekAria')}
        />
        <div className="spotify-seek-times">
          <span>{formatRestTime(Math.floor(shownPosition / 1000))}</span>
          <span>{formatRestTime(Math.floor((track?.duration ?? 0) / 1000))}</span>
        </div>
      </div>

      <div className="spotify-controls">
        <button type="button" className="spotify-ctrl" onClick={goPrevious} disabled={!track} aria-label={t('train.spotifyPreviousAria')}>
          <IconSkipBack size={22} />
        </button>
        {playButton(24, 'spotify-ctrl play')}
        <button type="button" className="spotify-ctrl" onClick={goNext} disabled={!track} aria-label={t('train.spotifyNextAria')}>
          <IconSkipForward size={22} />
        </button>
      </div>
    </div>
  )
}
