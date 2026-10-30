import { createClient } from '@supabase/supabase-js'

/** URL du projet et clé publique "publishable" : conçues pour être embarquées côté client (la sécurité repose sur la RLS). */
const SUPABASE_URL = 'https://dychetxsugcbfyxpgxcs.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_BIvb_EdqhuSCD_IhRIT2EA_jaREx1KK'

const REMEMBER_KEY = 'fg.rememberMe'

export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setRememberMe(remember: boolean): void {
  try {
    localStorage.setItem(REMEMBER_KEY, String(remember))
  } catch {
    // Stockage indisponible : la session reste simplement en mémoire.
  }
}

/**
 * Stockage de la session : persistant (localStorage) si "se souvenir de moi" est coché,
 * sinon limité à l'onglet/la session du navigateur (sessionStorage).
 */
const sessionStorageAdapter = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    try {
      const target = getRememberMe() ? localStorage : sessionStorage
      const other = getRememberMe() ? sessionStorage : localStorage
      other.removeItem(key)
      target.setItem(key, value)
    } catch {
      // ignoré
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch {
      // ignoré
    }
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
})
