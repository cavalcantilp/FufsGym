import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { AI_MODELS, AI_MODEL_INFO, loadAiKey, loadAiModel, saveAiKey, saveAiModel, validateAiKey } from '../lib/wizardAi'

type Status = 'idle' | 'checking' | 'valid' | 'invalid' | 'network'

/** Clé Anthropic personnelle pour l'assistant : vérifiée avant d'être considérée comme utilisable. */
export function AiSettings() {
  const { t } = useApp()
  const [saved, setSaved] = useState(loadAiKey)
  const [draft, setDraft] = useState(saved.key)
  const [status, setStatus] = useState<Status>(saved.valid ? 'valid' : 'idle')
  const [model, setModel] = useState(loadAiModel)
  const trimmed = draft.trim()

  const verify = async () => {
    setStatus('checking')
    try {
      const valid = await validateAiKey(trimmed)
      saveAiKey(trimmed, valid)
      setSaved({ key: trimmed, valid })
      setStatus(valid ? 'valid' : 'invalid')
    } catch {
      setStatus('network')
    }
  }

  const remove = () => {
    saveAiKey('', false)
    setSaved({ key: '', valid: false })
    setDraft('')
    setStatus('idle')
  }

  return (
    <div className="card">
      <div className="card-title">{t('ai.title')}</div>
      <p className="hint">{t('ai.hint')}</p>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="ai-key">{t('ai.keyLabel')}</label>
        <input
          id="ai-key"
          type="password"
          autoComplete="off"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setStatus(event.target.value.trim() === saved.key && saved.valid ? 'valid' : 'idle')
          }}
          placeholder="sk-ant-…"
        />
      </div>
      {status === 'valid' ? <p className="hint positive">{t('ai.valid')}</p> : null}
      {status === 'invalid' ? <p className="hint danger">{t('ai.invalid')}</p> : null}
      {status === 'network' ? <p className="hint danger">{t('ai.network')}</p> : null}
      {status === 'valid' ? (
        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="ai-model">{t('ai.modelLabel')}</label>
          <select
            id="ai-model"
            value={model}
            onChange={(event) => {
              const next = event.target.value as typeof model
              setModel(next)
              saveAiModel(next)
            }}
          >
            {AI_MODELS.map((key) => (
              <option key={key} value={key}>
                {AI_MODEL_INFO[key].label} — {t('ai.modelCost', { cost: String(AI_MODEL_INFO[key].typicalUsd) })}
              </option>
            ))}
          </select>
          <p className="hint">{t(`ai.model.${model}`)}</p>
        </div>
      ) : null}
      <div className="stack" style={{ marginTop: 12 }}>
        {trimmed && status !== 'valid' ? (
          <button type="button" className="btn secondary" disabled={status === 'checking'} onClick={() => void verify()}>
            {status === 'checking' ? t('ai.checking') : t('ai.verify')}
          </button>
        ) : null}
        {saved.key ? (
          <button type="button" className="btn danger" onClick={remove}>
            {t('ai.remove')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
