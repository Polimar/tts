import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { listVoices } from '../api/voices'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ToastProvider'

type AuthMode = 'login' | 'register'

const DEFAULT_API_KEY = import.meta.env.VITE_REGISTER_API_KEY ?? ''

export function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/coda" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFieldError(null)
    setSubmitting(true)

    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        if (!apiKey.trim()) {
          throw new Error('Chiave API richiesta per la registrazione (header X-API-Key).')
        }
        await register(username, password, apiKey.trim())
      }

      let redirectTo = '/coda'
      try {
        const voices = await listVoices()
        if (voices.length === 0) redirectTo = '/voci'
      } catch {
        redirectTo = '/voci'
      }

      navigate(redirectTo)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operazione non riuscita.'
      setFieldError(message)
      showToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">TTS Studio</h1>
        <p className="auth-card__subtitle">Clonazione vocale italiana</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tabs__btn${mode === 'login' ? ' auth-tabs__btn--active' : ''}`}
            onClick={() => { setMode('login'); setFieldError(null) }}
          >
            Accedi
          </button>
          <button
            type="button"
            className={`auth-tabs__btn${mode === 'register' ? ' auth-tabs__btn--active' : ''}`}
            onClick={() => { setMode('register'); setFieldError(null) }}
          >
            Registrati
          </button>
        </div>

        <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="field">
            <span className="field__label">Username</span>
            <input
              type="text"
              className="field__input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={64}
              autoComplete="username"
              placeholder="mario.rossi"
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              type="password"
              className="field__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Minimo 8 caratteri"
            />
          </label>

          {mode === 'register' && (
            <label className="field">
              <span className="field__label">Chiave API (X-API-Key)</span>
              <input
                type="password"
                className="field__input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                placeholder="Valore di API_KEY dal server"
              />
              <span className="field__hint">
                Richiesta dal backend per la registrazione. Imposta VITE_REGISTER_API_KEY in dev.
              </span>
            </label>
          )}

          {fieldError && (
            <p className="field__error" role="alert">
              {fieldError}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
            {submitting ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Crea account'}
          </button>
        </form>

        <p className="auth-card__footer">
          {mode === 'login' ? (
            <>
              Non hai un account?{' '}
              <button type="button" className="link-btn" onClick={() => setMode('register')}>
                Registrati
              </button>
            </>
          ) : (
            <>
              Hai già un account?{' '}
              <button type="button" className="link-btn" onClick={() => setMode('login')}>
                Accedi
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
