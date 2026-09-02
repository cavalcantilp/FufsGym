import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  buildSpotifyAuthorizeUrl,
  clearSpotifyAuthCallbackFromUrl,
  clearSpotifyTokens,
  exchangeSpotifyCode,
  loadSpotifyClientId,
  loadSpotifyTokens,
  readSpotifyAuthCallback,
  refreshSpotifyTokens,
  saveSpotifyClientId,
  saveSpotifyTokens,
  type SpotifyTokens,
} from '../lib/spotifyAuth'

export interface SpotifyTrackInfo {
  name: string
  artist: string
  albumArt: string | null
  isPaused: boolean
  /** Lien open.spotify.com vers ce morceau, pour l'ouvrir dans l'app/le site Spotify. */
  url: string | null
  /** Position au moment de cet état (ms) ; à l'écran, interpoler avec le temps écoulé depuis `positionUpdatedAt` si en lecture. */
  position: number
  duration: number
  positionUpdatedAt: number
  /** L'API de lecture en cours ne donne pas la piste précédente/suivante : toujours vide. */
  previousArt: string | null
  nextArt: string | null
}

type SpotifyErrorKind = 'premium_required' | 'auth_failed' | 'generic' | null

interface SpotifyState {
  clientId: string
  setClientId: (id: string) => void
  /** Tokens présents et valides : ne veut pas dire qu'on a déjà une lecture en cours à afficher. */
  connected: boolean
  connecting: boolean
  /** Première lecture de l'état de lecture effectuée (peut n'y avoir aucun morceau en cours). */
  playerReady: boolean
  track: SpotifyTrackInfo | null
  error: SpotifyErrorKind
  redirectUri: string
  connect: () => Promise<void>
  disconnect: () => void
  togglePlay: () => void
  nextTrack: () => void
  previousTrack: () => void
  seek: (positionMs: number) => void
}

const SpotifyContext = createContext<SpotifyState | null>(null)

const TOKEN_REFRESH_MARGIN_MS = 60_000
/** Cadence de lecture de l'état de lecture : assez réactif sans se faire rate-limiter par l'API. */
const POLL_INTERVAL_MS = 4_000

interface SpotifyPlaybackStateResponse {
  is_playing: boolean
  progress_ms: number | null
  item: {
    name: string
    artists: { name: string }[]
    album: { images: { url: string }[] }
    duration_ms: number
    external_urls: { spotify?: string }
  } | null
}

function trackFromApiState(data: SpotifyPlaybackStateResponse | null): SpotifyTrackInfo | null {
  if (!data?.item) return null
  return {
    name: data.item.name,
    artist: data.item.artists.map((a) => a.name).join(', '),
    albumArt: data.item.album.images[0]?.url ?? null,
    isPaused: !data.is_playing,
    url: data.item.external_urls.spotify ?? null,
    position: data.progress_ms ?? 0,
    duration: data.item.duration_ms,
    positionUpdatedAt: Date.now(),
    previousArt: null,
    nextArt: null,
  }
}

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientIdState] = useState(() => loadSpotifyClientId())
  const [tokens, setTokensState] = useState<SpotifyTokens | null>(() => loadSpotifyTokens())
  const [connecting, setConnecting] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [track, setTrack] = useState<SpotifyTrackInfo | null>(null)
  const [error, setError] = useState<SpotifyErrorKind>(null)
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens
  const trackRef = useRef(track)
  trackRef.current = track

  const setClientId = useCallback((id: string) => {
    setClientIdState(id)
    saveSpotifyClientId(id)
  }, [])

  const setTokens = useCallback((next: SpotifyTokens | null) => {
    setTokensState(next)
    if (next) saveSpotifyTokens(next)
    else clearSpotifyTokens()
  }, [])

  /** Access token toujours valide pour l'API : renouvelle proactivement s'il approche de l'expiration. */
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    const current = tokensRef.current
    if (!current) return null
    if (current.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) return current.accessToken
    try {
      const refreshed = await refreshSpotifyTokens(clientId, current.refreshToken)
      setTokens(refreshed)
      return refreshed.accessToken
    } catch {
      setError('auth_failed')
      setTokens(null)
      return null
    }
  }, [clientId, setTokens])

  // Retour d'autorisation Spotify (?code=&state=) : échange contre les tokens puis nettoie l'URL.
  // Le code d'autorisation est à usage unique : l'URL est nettoyée avant même l'échange (pas
  // dans le .finally) pour qu'un double montage (React StrictMode en dev) ne le rejoue pas.
  useEffect(() => {
    const callback = readSpotifyAuthCallback()
    if (!callback) return
    clearSpotifyAuthCallbackFromUrl()
    const id = loadSpotifyClientId()
    setConnecting(true)
    exchangeSpotifyCode(id, callback.code, callback.state)
      .then((next) => {
        setTokens(next)
        setError(null)
      })
      .catch(() => setError('auth_failed'))
      .finally(() => setConnecting(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lit périodiquement ce qui joue réellement sur le compte Spotify (l'app native sur le
  // téléphone, typiquement) plutôt que de créer un lecteur dans l'onglet : un lecteur web
  // deviendrait l'appareil actif et couperait la lecture en cours ailleurs.
  useEffect(() => {
    if (!tokens) {
      setPlayerReady(false)
      setTrack(null)
      return
    }
    let cancelled = false

    const poll = async () => {
      const token = await getValidAccessToken()
      if (cancelled || !token) return
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return
        if (response.status === 204) {
          setTrack(null)
          setError(null)
        } else if (response.ok) {
          setTrack(trackFromApiState(await response.json()))
          setError(null)
        } else if (response.status !== 401) {
          setError('generic')
        }
        setPlayerReady(true)
      } catch {
        if (!cancelled) setError('generic')
      }
    }

    void poll()
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [tokens, getValidAccessToken])

  const connect = useCallback(async () => {
    if (!clientId) return
    setConnecting(true)
    setError(null)
    window.location.href = await buildSpotifyAuthorizeUrl(clientId)
  }, [clientId])

  const disconnect = useCallback(() => {
    setPlayerReady(false)
    setTrack(null)
    setError(null)
    setTokens(null)
  }, [setTokens])

  /** Envoie une commande de lecture à l'appareil actuellement actif (l'app native, en général). */
  const callPlaybackEndpoint = useCallback(
    async (path: string, method: string) => {
      const token = await getValidAccessToken()
      if (!token) return
      const response = await fetch(`https://api.spotify.com/v1/me/player${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.status === 403) setError('premium_required')
    },
    [getValidAccessToken],
  )

  const togglePlay = useCallback(() => {
    void callPlaybackEndpoint(trackRef.current?.isPaused ? '/play' : '/pause', 'PUT')
  }, [callPlaybackEndpoint])
  const nextTrack = useCallback(() => {
    void callPlaybackEndpoint('/next', 'POST')
  }, [callPlaybackEndpoint])
  const previousTrack = useCallback(() => {
    void callPlaybackEndpoint('/previous', 'POST')
  }, [callPlaybackEndpoint])
  const seek = useCallback(
    (positionMs: number) => {
      void callPlaybackEndpoint(`/seek?position_ms=${Math.round(positionMs)}`, 'PUT')
    },
    [callPlaybackEndpoint],
  )

  const value: SpotifyState = {
    clientId,
    setClientId,
    connected: Boolean(tokens),
    connecting,
    playerReady,
    track,
    error,
    redirectUri: `${window.location.origin}/`,
    connect,
    disconnect,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
  }

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>
}

export function useSpotify(): SpotifyState {
  const ctx = useContext(SpotifyContext)
  if (!ctx) throw new Error('useSpotify must be used within SpotifyProvider')
  return ctx
}
