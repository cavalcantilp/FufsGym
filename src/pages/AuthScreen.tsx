import { useState, type FormEvent } from 'react'
import { useApp } from '../state/AppContext'
import { useAuth } from '../state/AuthContext'
import { getRememberMe } from '../lib/supabase'
import { Logo } from '../components/icons'

export function AuthScreen() {
  const { t } = useApp()
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(getRememberMe)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const message = await (mode === 'signIn' ? signIn : signUp)(email.trim(), password, remember)
    if (message) setError(message)
    setBusy(false)
  }

  const google = async () => {
    setBusy(true)
    setError(null)
    const message = await signInWithGoogle(remember)
    if (message) {
      setError(message)
      setBusy(false)
    }
  }

  return (
    <div className="onboarding auth-screen">
      <div className="brand">
        <Logo />
        <span className="app-name">{t('app.name')}</span>
        <h1>{t('auth.title')}</h1>
        <p>{t('auth.subtitle')}</p>
      </div>

      <form className="stack" onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="auth-email">{t('auth.email')}</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="auth-password">{t('auth.password')}</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <label className="remember-row">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span>{t('auth.remember')}</span>
        </label>
        {error ? <p className="hint danger">{error}</p> : null}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? t('auth.working') : mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        </button>
      </form>

      <div className="auth-divider">{t('auth.or')}</div>

      <button type="button" className="btn secondary" disabled={busy} onClick={() => void google()}>
        {t('auth.google')}
      </button>

      <button
        type="button"
        className="auth-switch"
        onClick={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn')
          setError(null)
        }}
      >
        {mode === 'signIn' ? t('auth.toSignUp') : t('auth.toSignIn')}
      </button>
    </div>
  )
}
