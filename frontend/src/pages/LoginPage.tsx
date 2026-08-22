import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { listVoices } from '../api/voices'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ToastProvider'

type AuthMode = 'login' | 'register'

export function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
        await register(username, password)
      }

      let redirectTo = '/coda'
      try {
        const { items } = await listVoices()
        if (items.length === 0) redirectTo = '/voci'
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
              autoComplete="username"
              placeholder="il_tuo_username"
              minLength={3}
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
