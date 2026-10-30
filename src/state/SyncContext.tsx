import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { load, save } from '../lib/storage'
import { useApp, type AppSnapshot } from './AppContext'
import { useAuth } from './AuthContext'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

interface SyncMeta {
  userId: string
  /** Empreinte des données locales à la dernière synchro réussie. */
  hash: string
  /** Horodatage `updated_at` de la ligne cloud à ce moment-là. */
  remoteUpdatedAt: string
}

interface RemoteRow {
  data: unknown
  updated_at: string
}

interface SyncState {
  /** Réconciliation initiale terminée (réussie ou non) : l'appli peut s'afficher. */
  ready: boolean
  status: SyncStatus
  /** Données différentes sur cet appareil et dans le cloud, à arbitrer par l'utilisateur. */
  conflict: boolean
  resolveConflict: (keep: 'device' | 'cloud') => Promise<void>
  /** Envoie immédiatement les modifications en attente ; renvoie `false` en cas d'échec. */
  flush: () => Promise<boolean>
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncState | null>(null)

const META_KEY = 'syncMeta'
const PUSH_DEBOUNCE_MS = 1500

function hashOf(value: unknown): string {
  const text = JSON.stringify(value)
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return `${text.length}:${h}`
}

/** Un snapshot vide n'est jamais poussé : évite d'écraser le cloud après une réinitialisation locale. */
function isEmpty(snapshot: AppSnapshot): boolean {
  return (
    snapshot.sessions.length === 0 &&
    snapshot.workouts.length === 0 &&
    snapshot.customExercises.length === 0 &&
    snapshot.favoriteExerciseIds.length === 0 &&
    snapshot.schedules.length === 0 &&
    Object.keys(snapshot.dayNotes).length === 0 &&
    Object.keys(snapshot.exerciseNotes).length === 0
  )
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { snapshot, importData, completeOnboarding } = useApp()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [conflictRow, setConflictRow] = useState<RemoteRow | null>(null)

  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  const awaitingApplyRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyRef = useRef(false)
  readyRef.current = ready
  const conflictRef = useRef(conflictRow)
  conflictRef.current = conflictRow

  const loadMeta = useCallback((): SyncMeta | null => {
    const meta = load<SyncMeta | null>(META_KEY, null)
    return meta && meta.userId === userId ? meta : null
  }, [userId])

  const push = useCallback(async (): Promise<boolean> => {
    if (!userId) return true
    const snap = snapshotRef.current
    if (isEmpty(snap)) return true
    const hash = hashOf(snap)
    if (loadMeta()?.hash === hash) return true
    setStatus('syncing')
    const { data, error } = await supabase
      .from('user_data')
      .upsert({ user_id: userId, data: snap, updated_at: new Date().toISOString() })
      .select('updated_at')
      .single()
    if (error || !data) {
      setStatus('error')
      return false
    }
    save<SyncMeta>(META_KEY, { userId, hash, remoteUpdatedAt: data.updated_at })
    setStatus('synced')
    return true
  }, [userId, loadMeta])

  const applyRemote = useCallback(
    (row: RemoteRow) => {
      awaitingApplyRef.current = row.updated_at
      if (!importData(row.data)) {
        awaitingApplyRef.current = null
        setStatus('error')
        return
      }
      completeOnboarding()
      setStatus('synced')
    },
    [importData, completeOnboarding],
  )

  const reconcile = useCallback(async () => {
    if (!userId) return
    setStatus('syncing')
    const { data: row, error } = await supabase
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      setStatus('error')
      return
    }
    const snap = snapshotRef.current
    const meta = loadMeta()
    const clean = meta !== null && meta.hash === hashOf(snap)
    if (!row) {
      setStatus((await push()) ? 'synced' : 'error')
      return
    }
    if (meta && meta.remoteUpdatedAt === row.updated_at) {
      setStatus(clean || (await push()) ? 'synced' : 'error')
      return
    }
    if (isEmpty(snap) || clean) applyRemote(row)
    else {
      setConflictRow(row)
      setStatus('idle')
    }
  }, [userId, loadMeta, push, applyRemote])

  const api = useRef({ push, reconcile })
  api.current = { push, reconcile }

  // Réconciliation initiale à chaque (re)connexion.
  useEffect(() => {
    setConflictRow(null)
    if (!userId) {
      setReady(true)
      return
    }
    setReady(false)
    let cancelled = false
    void api.current.reconcile().finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  // Après application des données cloud : mémorise l'empreinte résultante, sans repousser.
  // Sinon : envoi différé après chaque modification locale.
  useEffect(() => {
    if (!userId) return
    if (awaitingApplyRef.current) {
      save<SyncMeta>(META_KEY, { userId, hash: hashOf(snapshot), remoteUpdatedAt: awaitingApplyRef.current })
      awaitingApplyRef.current = null
      return
    }
    if (!readyRef.current || conflictRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void api.current.push(), PUSH_DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [snapshot, userId])

  // Au retour au premier plan : récupère les changements faits sur un autre appareil ;
  // en partant en arrière-plan : envoie tout de suite ce qui est en attente.
  useEffect(() => {
    if (!userId) return
    const onVisibility = () => {
      if (!readyRef.current || conflictRef.current) return
      if (document.visibilityState === 'hidden') {
        if (timerRef.current) clearTimeout(timerRef.current)
        void api.current.push()
      } else {
        void api.current.reconcile()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [userId])

  const resolveConflict = useCallback(
    async (keep: 'device' | 'cloud') => {
      const row = conflictRef.current
      if (!row || !userId) return
      setConflictRow(null)
      if (keep === 'cloud') {
        applyRemote(row)
      } else {
        save<SyncMeta>(META_KEY, { userId, hash: '', remoteUpdatedAt: row.updated_at })
        await push()
      }
    },
    [userId, applyRemote, push],
  )

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    return push()
  }, [push])

  const value = useMemo<SyncState>(
    () => ({ ready, status, conflict: conflictRow !== null, resolveConflict, flush, syncNow: reconcile }),
    [ready, status, conflictRow, resolveConflict, flush, reconcile],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncState {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
