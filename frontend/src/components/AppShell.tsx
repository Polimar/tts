import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastProvider'

const NAV_ITEMS = [
  { to: '/voci', label: 'Voci' },
  { to: '/nuovo', label: 'Nuovo job' },
  { to: '/coda', label: 'Coda' },
  { to: '/impostazioni', label: 'Impostazioni' },
] as const

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Errore durante il logout.', 'error')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">TTS</span>
          <span className="sidebar__subtitle">Studio vocale</span>
        </div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <span className="sidebar__link sidebar__link--disabled" title="Disponibile in v1.1">
            Dialoghi <span className="badge">v1.1</span>
          </span>
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button type="button" className="mobile-menu-btn" aria-label="Menu">
            ☰
          </button>
          <div className="app-header__user">
            <span className="app-header__email">{user?.username}</span>
            <button type="button" className="btn btn--ghost" onClick={() => void handleLogout()}>
              Esci
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
