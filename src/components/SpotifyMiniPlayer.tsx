import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext'
import { useSpotify } from '../state/SpotifyContext'
import { IconChevronDown, IconPause, IconPlay, IconSpotifyLogo } from './icons'
import { formatRestTime } from '../lib/rest'

/** Distance de glissement (px) à partir de laquelle un swipe change de piste. */
const SWIPE_THRESHOLD = 40

/**
 * Mini-lecteur affiché pendant une séance active, une fois Spotify connecté
 * (connexion configurée dans Réglages). Replié par défaut en simple ligne
 * discrète (sans habillage de carte) : la ligne entière ouvre le lecteur complet.
 */
export function SpotifyMiniPlayer() {
  const { t } = useApp()
  const { connected, playerReady, track, error, togglePlay, nextTrack, previousTrack, seek } = useSpotify()
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

  if (!open) {
    return (
      <button type="button" className="spotify-collapsed-bar" onClick={() => setOpen(true)}>
        <IconSpotifyLogo size={14} />
        <span className="spotify-collapsed-track">
          {track ? `${track.name} — ${track.artist}` : t('train.spotifyConnecting')}
        </span>
        <IconChevronDown size={14} />
      </button>
    )
  }

  const shownPosition = dragPosition ?? displayPosition

  return (
    <div className="card spotify-player">
      <div className="spotify-header-row">
        <a
          className="spotify-brand-header"
          href={track?.url ?? 'https://open.spotify.com'}
          target="_blank"
          rel="noreferrer"
          aria-label={t('train.spotifyOpenAria')}
        >
          <IconSpotifyLogo size={20} />
          <span>Spotify</span>
        </a>
        <button
          type="button"
          className="icon-btn spotify-toggle"
          onClick={() => setOpen(false)}
          aria-label={t('train.spotifyMinimizeAria')}
        >
          <IconChevronDown open size={16} />
        </button>
      </div>

      {error === 'premium_required' ? (
        <p className="hint danger">{t('train.spotifyPremiumRequired')}</p>
      ) : error === 'generic' ? (
        <p className="hint danger">{t('train.spotifyGenericError')}</p>
      ) : null}

      <div
        className="spotify-carousel"
        onPointerDown={(event) => onSwipeStart(event.clientX)}
        onPointerUp={(event) => onSwipeEnd(event.clientX)}
      >
        <button type="button" className="spotify-carousel-side" onClick={goPrevious} aria-label={t('train.spotifyPreviousAria')}>
          {track?.previousArt ? <img src={track.previousArt} alt="" /> : <span className="spotify-art placeholder small" />}
        </button>
        <div className="spotify-carousel-center">
          <div key={track?.url ?? 'none'} className={`spotify-art-wrap slide-${directionRef.current}`}>
            {track?.albumArt ? (
              <img src={track.albumArt} alt="" className="spotify-art" />
            ) : (
              <div className="spotify-art placeholder" />
            )}
          </div>
        </div>
        <button type="button" className="spotify-carousel-side" onClick={goNext} aria-label={t('train.spotifyNextAria')}>
          {track?.nextArt ? <img src={track.nextArt} alt="" /> : <span className="spotify-art placeholder small" />}
        </button>
      </div>

      <div className="spotify-track-info center">
        <span className="name">{track?.name ?? (playerReady ? t('train.spotifyNoTrack') : t('train.spotifyConnecting'))}</span>
        {track ? <span className="hint">{track.artist}</span> : null}
      </div>

      <div className="spotify-seek">
        <input
          type="range"
          className="spotify-seek-input"
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
        <button
          type="button"
          className="icon-btn accent"
          onClick={togglePlay}
          aria-label={track?.isPaused ? t('train.spotifyPlayAria') : t('train.spotifyPauseAria')}
        >
          {track && !track.isPaused ? <IconPause size={22} /> : <IconPlay size={22} />}
        </button>
      </div>
    </div>
  )
}
