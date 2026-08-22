import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listJobs } from '../api/jobs'
import { listVoices } from '../api/voices'
import { StatusChip } from '../components/StatusChip'
import { useActiveJobsPolling } from '../hooks/useJobPolling'
import type { Job } from '../types/api'
import { formatDateTime } from '../utils/format'

function jobPreview(text: string, max = 48): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export function QueuePage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [voiceNames, setVoiceNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setError(null)
    try {
      const [jobItems, voiceItems] = await Promise.all([listJobs(), listVoices()])
      setJobs(jobItems)
      const names: Record<string, string> = {}
      for (const v of voiceItems) names[v.id] = v.name
      setVoiceNames(names)
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

  const queuedCount = useMemo(
    () => jobs.filter((j) => j.status === 'queued').length,
    [jobs],
  )

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Coda job</h1>
          <p className="page-header__desc">
            Monitora i job di sintesi vocale.
            {queuedCount > 0 && (
              <span className="queue-hint"> {queuedCount} in coda.</span>
            )}
          </p>
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
                <th>Testo</th>
                <th>Voce</th>
                <th>Creato</th>
                <th>Chunk</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <StatusChip status={job.status} />
                  </td>
                  <td className="data-table__truncate">{jobPreview(job.text)}</td>
                  <td>{voiceNames[job.voice_id] ?? job.voice_id.slice(0, 8)}</td>
                  <td>{formatDateTime(job.created_at)}</td>
                  <td>{job.chunk_count > 0 ? job.chunk_count : '—'}</td>
                  <td className="data-table__actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => navigate(`/coda/${job.id}`)}
                    >
                      Apri
                    </button>
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
