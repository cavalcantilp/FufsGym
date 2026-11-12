import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { buildShareUrl } from '../lib/share'
import { IconShare } from './icons'
import type { Workout } from '../lib/types'

/** Partage un ou plusieurs entraînements par lien : feuille de partage du téléphone, sinon copie du lien. */
export function ShareButton({ workouts, label }: { workouts: Workout[]; label: string }) {
  const { t, schedules, customExercises } = useApp()
  const [toast, setToast] = useState<'copied' | 'failed' | null>(null)

  const share = async () => {
    const url = await buildShareUrl(workouts, schedules, customExercises)
    const title = workouts.length === 1 ? workouts[0].name : t('share.programTitle')
    try {
      if (navigator.share) {
        await navigator.share({ title, text: t('share.message', { title }), url })
        return
      }
      await navigator.clipboard.writeText(url)
      setToast('copied')
    } catch (error) {
      // Fermer la feuille de partage n'est pas une erreur.
      if (error instanceof DOMException && error.name === 'AbortError') return
      setToast('failed')
    }
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <>
      <button type="button" className="btn secondary" onClick={() => void share()}>
        <IconShare size={18} />
        {label}
      </button>
      {toast ? <div className="toast">{t(toast === 'copied' ? 'share.copied' : 'share.failed')}</div> : null}
    </>
  )
}
