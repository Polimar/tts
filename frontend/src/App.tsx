import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ToastProvider'
import { LoginPage } from './pages/LoginPage'
import { VoicesPage } from './pages/VoicesPage'
import { NewJobPage } from './pages/NewJobPage'
import { QueuePage } from './pages/QueuePage'
import { JobDetailPage } from './pages/JobDetailPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/voci" element={<VoicesPage />} />
                <Route path="/nuovo" element={<NewJobPage />} />
                <Route path="/coda" element={<QueuePage />} />
                <Route path="/coda/:jobId" element={<JobDetailPage />} />
                <Route path="/impostazioni" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/coda" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
