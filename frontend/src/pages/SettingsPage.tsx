import { useAuth } from '../hooks/useAuth'
import { formatDateTime } from '../utils/format'

export function SettingsPage() {
  const { user } = useAuth()

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
          Autenticazione tramite token Bearer (<code>Authorization: Bearer &lt;token&gt;</code>).
          Il token è conservato in sessionStorage per il refresh della pagina.
        </p>
      </section>

      <section className="settings-section">
        <h2>Export</h2>
        <p className="text-muted">
          Download WAV/MP3 disponibile dal dettaglio job completato.
        </p>
      </section>
    </div>
  )
}
