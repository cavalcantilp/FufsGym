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
import type { SpotifyPlaybackState, SpotifyPlayerInstance } from '../lib/spotifyPlayerTypes'

export interface SpotifyTrackInfo {
  name: string
  artist: string
  albumArt: string | null
  isPaused: boolean
}

type SpotifyErrorKind = 'premium_required' | 'auth_failed' | 'generic' | null

interface SpotifyState {
  clientId: string
  setClientId: (id: string) => void
  /** Tokens présents et valides : ne veut pas dire que le lecteur SDK est déjà prêt. */
  connected: boolean
  connecting: boolean
  /** Prêt à jouer : device Spotify Connect créé pour cet onglet. */
  playerReady: boolean
  track: SpotifyTrackInfo | null
  error: SpotifyErrorKind
  redirectUri: string
  connect: () => Promise<void>
  disconnect: () => void
  togglePlay: () => void
  nextTrack: () => void
  previousTrack: () => void
}

const SpotifyContext = createContext<SpotifyState | null>(null)

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js'
const TOKEN_REFRESH_MARGIN_MS = 60_000

function loadSdkScript(): void {
  if (document.querySelector(`script[src="${SDK_SRC}"]`)) return
  const script = document.createElement('script')
  script.src = SDK_SRC
  script.async = true
  document.body.appendChild(script)
}

function trackFromState(state: SpotifyPlaybackState | null): SpotifyTrackInfo | null {
  if (!state) return null
  const current = state.track_window.current_track
  return {
    name: current.name,
    artist: current.artists.map((a) => a.name).join(', '),
    albumArt: current.album.images[0]?.url ?? null,
    isPaused: state.paused,
  }
}

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientIdState] = useState(() => loadSpotifyClientId())
  const [tokens, setTokensState] = useState<SpotifyTokens | null>(() => loadSpotifyTokens())
  const [connecting, setConnecting] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [track, setTrack] = useState<SpotifyTrackInfo | null>(null)
  const [error, setError] = useState<SpotifyErrorKind>(null)
  const playerRef = useRef<SpotifyPlayerInstance | null>(null)
  const tokensRef = useRef(tokens)
  tokensRef.current = tokens

  const setClientId = useCallback((id: string) => {
    setClientIdState(id)
    saveSpotifyClientId(id)
  }, [])

  const setTokens = useCallback((next: SpotifyTokens | null) => {
    setTokensState(next)
    if (next) saveSpotifyTokens(next)
    else clearSpotifyTokens()
  }, [])

  /** Access token toujours valide pour le SDK/l'API : renouvelle proactivement s'il approche de l'expiration. */
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

  // Charge le SDK et crée le lecteur dès qu'on a des tokens ; le détruit à la déconnexion.
  useEffect(() => {
    if (!tokens) return
    let cancelled = false

    const setup = () => {
      if (cancelled || playerRef.current) return
      const player = new window.Spotify!.Player({
        name: 'FufsGym',
        getOAuthToken: (cb) => {
          void getValidAccessToken().then((token) => {
            if (token) cb(token)
          })
        },
        volume: 0.7,
      })
      playerRef.current = player

      player.addListener('ready', ({ device_id }) => {
        setPlayerReady(true)
        void getValidAccessToken().then((token) => {
          if (!token) return
          void fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_ids: [device_id], play: false }),
          })
        })
      })
      player.addListener('not_ready', () => setPlayerReady(false))
      player.addListener('player_state_changed', (state) => setTrack(trackFromState(state)))
      player.addListener('initialization_error', () => setError('generic'))
      player.addListener('authentication_error', () => setError('auth_failed'))
      player.addListener('account_error', () => setError('premium_required'))
      void player.connect()
    }

    if (window.Spotify) {
      setup()
    } else {
      window.onSpotifyWebPlaybackSDKReady = setup
      loadSdkScript()
    }

    return () => {
      cancelled = true
    }
  }, [tokens, getValidAccessToken])

  const connect = useCallback(async () => {
    if (!clientId) return
    setConnecting(true)
    setError(null)
    window.location.href = await buildSpotifyAuthorizeUrl(clientId)
  }, [clientId])

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect()
    playerRef.current = null
    setPlayerReady(false)
    setTrack(null)
    setError(null)
    setTokens(null)
  }, [setTokens])

  const togglePlay = useCallback(() => {
    void playerRef.current?.togglePlay()
  }, [])
  const nextTrack = useCallback(() => {
    void playerRef.current?.nextTrack()
  }, [])
  const previousTrack = useCallback(() => {
    void playerRef.current?.previousTrack()
  }, [])

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
  }

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>
}

export function useSpotify(): SpotifyState {
  const ctx = useContext(SpotifyContext)
  if (!ctx) throw new Error('useSpotify must be used within SpotifyProvider')
  return ctx
}
