import { load, save } from './storage'

/**
 * Authentification Spotify en PKCE (Authorization Code + code_verifier), sans
 * backend : le client_id n'est pas secret, et l'échange de code se fait
 * directement depuis le navigateur vers l'API Spotify.
 */

export const SPOTIFY_SCOPES = 'user-read-playback-state user-modify-playback-state'

const SPOTIFY_KEYS = {
  clientId: 'spotifyClientId',
  tokens: 'spotifyTokens',
  pkceVerifier: 'spotifyPkceVerifier',
  pkceState: 'spotifyPkceState',
} as const

export interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  /** Timestamp epoch (ms) d'expiration de l'access token. */
  expiresAt: number
}

export function loadSpotifyClientId(): string {
  return load(SPOTIFY_KEYS.clientId, '')
}

export function saveSpotifyClientId(clientId: string): void {
  save(SPOTIFY_KEYS.clientId, clientId)
}

export function loadSpotifyTokens(): SpotifyTokens | null {
  return load<SpotifyTokens | null>(SPOTIFY_KEYS.tokens, null)
}

export function saveSpotifyTokens(tokens: SpotifyTokens): void {
  save(SPOTIFY_KEYS.tokens, tokens)
}

export function clearSpotifyTokens(): void {
  save(SPOTIFY_KEYS.tokens, null)
}

/** URI de redirection : toujours l'origine courante, pour correspondre quel que soit le domaine de déploiement. */
export function spotifyRedirectUri(): string {
  return `${window.location.origin}/`
}

function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]).join('')
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(digest)
}

/** Construit l'URL d'autorisation Spotify et mémorise verifier/state pour l'échange au retour. */
export async function buildSpotifyAuthorizeUrl(clientId: string): Promise<string> {
  const verifier = randomString(64)
  const state = randomString(16)
  save(SPOTIFY_KEYS.pkceVerifier, verifier)
  save(SPOTIFY_KEYS.pkceState, state)
  const challenge = await codeChallengeFor(verifier)
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: spotifyRedirectUri(),
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })
  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

/** Lit `?code=`/`?state=` dans l'URL courante (retour d'autorisation Spotify), sans y toucher. */
export function readSpotifyAuthCallback(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (!code || !state) return null
  return { code, state }
}

/** Retire `code`/`state`/`error` de l'URL une fois traités, sans recharger la page. */
export function clearSpotifyAuthCallbackFromUrl(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('code')
  url.searchParams.delete('state')
  url.searchParams.delete('error')
  window.history.replaceState({}, '', url.toString())
}

/** Échange le code d'autorisation contre les tokens, en vérifiant le state anti-CSRF. */
export async function exchangeSpotifyCode(clientId: string, code: string, state: string): Promise<SpotifyTokens> {
  const expectedState = load(SPOTIFY_KEYS.pkceState, '')
  const verifier = load(SPOTIFY_KEYS.pkceVerifier, '')
  if (!verifier || state !== expectedState) throw new Error('spotify_state_mismatch')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: spotifyRedirectUri(),
    client_id: clientId,
    code_verifier: verifier,
  })
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error('spotify_token_exchange_failed')
  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

/** Renouvelle l'access token via le refresh token ; Spotify ne renvoie pas toujours un nouveau refresh token. */
export async function refreshSpotifyTokens(clientId: string, refreshToken: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  })
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error('spotify_token_refresh_failed')
  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}
