import { useState } from 'react'
import { getStoredApiKey, setStoredApiKey } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { formatDateTime } from '../utils/format'

export function SettingsPage() {
  const { user } = useAuth()
  const [apiKey, setApiKey] = useState(getStoredApiKey() ?? '')

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Impostazioni</h1>
          <p className="page-header__desc">Account e preferenze.</p>
        </div>
      </header>

      <section className="settings-section">
        <h2>Account</h2>
        <dl className="detail-meta">
          <div>
            <dt>Username</dt>
            <dd>{user?.username}</dd>
          </div>
          <div>
            <dt>ID utente</dt>
            <dd><code>{user?.id}</code></dd>
          </div>
          {user?.created_at && (
            <div>
              <dt>Registrato il</dt>
              <dd>{formatDateTime(user.created_at)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="settings-section">
        <h2>Sessione</h2>
        <p className="text-muted">
          Autenticazione same-origin tramite cookie <code>tts_session</code> (HttpOnly).
        </p>
      </section>

      <section className="settings-section">
        <h2>Registrazione (API key)</h2>
        <p className="text-muted">
          Necessaria per creare nuovi account. Imposta la chiave fornita dall&apos;amministratore.
        </p>
        <label className="field">
          <span className="field__label">X-API-Key</span>
          <input
            className="field__input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={() => setStoredApiKey(apiKey)}
            placeholder="change-me-optional-static-api-key"
          />
        </label>
      </section>

      <section className="settings-section">
        <h2>Export</h2>
        <p className="text-muted">
          Download WAV dal dettaglio job. MP3 quando disponibile.
        </p>
      </section>
    </div>
  )
}
