import { useAuth } from '../hooks/useAuth'

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
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>ID utente</dt>
            <dd><code>{user?.id}</code></dd>
          </div>
        </dl>
      </section>

      <section className="settings-section">
        <h2>Export</h2>
        <p className="text-muted">
          Il formato di export predefinito sarà configurabile in una versione successiva.
          Attualmente è disponibile il download WAV dal dettaglio job.
        </p>
      </section>
    </div>
  )
}
