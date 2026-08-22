import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listJobs } from '../api/jobs'
import { StatusChip } from '../components/StatusChip'
import { useActiveJobsPolling } from '../hooks/useJobPolling'
import type { Job, JobType } from '../types/api'

const TYPE_LABELS: Record<JobType, string> = {
  text: 'Testo',
  book: 'Libro',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function QueuePage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setError(null)
    try {
      const data = await listJobs()
      setJobs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare la coda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  useActiveJobsPolling(jobs, () => void loadJobs())

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Coda job</h1>
          <p className="page-header__desc">Monitora i job di sintesi vocale.</p>
        </div>
        <Link to="/nuovo" className="btn btn--primary">
          Nuovo job
        </Link>
      </header>

      {loading && (
        <div className="skeleton-table">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => void loadJobs()}>
            Riprova
          </button>
        </div>
      )}

      {!loading && !error && jobs.length === 0 && (
        <div className="empty-state">
          <h2>Coda vuota</h2>
          <p>Nessun job in coda. Crea il tuo primo job di sintesi vocale.</p>
          <Link to="/nuovo" className="btn btn--primary">
            Nuovo job
          </Link>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stato</th>
                <th>Tipo</th>
                <th>Voce</th>
                <th>Testo</th>
                <th>Creato</th>
                <th>Progresso</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="data-table__row--clickable"
                  onClick={() => navigate(`/coda/${job.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/coda/${job.id}`)
                    }
                  }}
                >
                  <td>
                    <StatusChip status={job.status} />
                  </td>
                  <td>{TYPE_LABELS[job.job_type] ?? job.job_type}</td>
                  <td>{job.voice_name ?? job.voice_id}</td>
                  <td className="data-table__truncate">{truncate(job.text)}</td>
                  <td>{formatDateTime(job.created_at)}</td>
                  <td>
                    {job.status === 'running' && job.progress != null ? (
                      <div className="progress-bar">
                        <div className="progress-bar__fill" style={{ width: `${job.progress}%` }} />
                        <span className="progress-bar__label">{job.progress}%</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
