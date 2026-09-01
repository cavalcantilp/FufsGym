/**
 * Types minimaux pour le SDK Web Playback de Spotify (chargé dynamiquement via
 * <script>, pas de paquet npm) — seulement ce que l'app utilise réellement.
 */

export interface SpotifyPlayerTrack {
  name: string
  artists: { name: string }[]
  album: { images: { url: string }[] }
}

export interface SpotifyPlaybackState {
  paused: boolean
  position: number
  duration: number
  track_window: { current_track: SpotifyPlayerTrack }
}

export interface SpotifyPlayerInstance {
  connect(): Promise<boolean>
  disconnect(): void
  togglePlay(): Promise<void>
  nextTrack(): Promise<void>
  previousTrack(): Promise<void>
  getCurrentState(): Promise<SpotifyPlaybackState | null>
  addListener(event: 'ready' | 'not_ready', cb: (data: { device_id: string }) => void): void
  addListener(event: 'player_state_changed', cb: (state: SpotifyPlaybackState | null) => void): void
  addListener(
    event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
    cb: (data: { message: string }) => void,
  ): void
}

interface SpotifyPlayerConstructorOptions {
  name: string
  getOAuthToken: (callback: (token: string) => void) => void
  volume?: number
}

export interface SpotifyNamespace {
  Player: new (options: SpotifyPlayerConstructorOptions) => SpotifyPlayerInstance
}

declare global {
  interface Window {
    Spotify?: SpotifyNamespace
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}
