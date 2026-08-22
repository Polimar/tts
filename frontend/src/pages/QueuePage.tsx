import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cancelJob, listJobs } from '../api/jobs'
import { listVoices } from '../api/voices'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StatusChip } from '../components/StatusChip'
import { useToast } from '../components/ToastProvider'
import { useActiveJobsPolling } from '../hooks/useJobPolling'
import type { Job, SourceType } from '../types/api'
import { formatDateTime, formatProgressPercent } from '../utils/format'

const SOURCE_LABELS: Record<SourceType, string> = {
  text: 'Testo',
  chapter: 'Capitolo',
}

export function QueuePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [voiceNames, setVoiceNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Job | null>(null)

  const loadJobs = useCallback(async () => {
    setError(null)
    try {
      const [{ items }, { items: voices }] = await Promise.all([
        listJobs({ limit: 100 }),
        listVoices(),
      ])
      setJobs(items)
      const names: Record<string, string> = {}
      for (const v of voices) names[v.id] = v.name
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

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancelJob(cancelTarget.id)
      showToast('Job annullato.', 'success')
      setCancelTarget(null)
      await loadJobs()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Annullamento fallito.', 'error')
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Coda job</h1>
          <p className="page-header__desc">
            Monitora i job di sintesi vocale.
            {queuedCount > 0 && (
              <span className="queue-hint"> {queuedCount} in coda (max 10).</span>
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
                <th>Tipo</th>
                <th>Titolo</th>
                <th>Voce</th>
                <th>Creato</th>
                <th>Coda / Progresso</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const pct = formatProgressPercent(job.progress)
                return (
                  <tr key={job.id}>
                    <td>
                      <StatusChip status={job.status} />
                    </td>
                    <td>{SOURCE_LABELS[job.source_type] ?? job.source_type}</td>
                    <td className="data-table__truncate">
                      {job.title ?? <span className="text-muted">—</span>}
                    </td>
                    <td>{voiceNames[job.voice_id] ?? job.voice_id.slice(0, 8)}</td>
                    <td>{formatDateTime(job.created_at)}</td>
                    <td>
                      {job.status === 'queued' && job.queue_position != null ? (
                        <span>Pos. {job.queue_position}</span>
                      ) : job.status === 'running' ? (
                        <div className="progress-bar">
                          <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
                          <span className="progress-bar__label">{pct}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="data-table__actions">
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => navigate(`/coda/${job.id}`)}
                      >
                        Apri
                      </button>
                      {job.status === 'queued' && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => setCancelTarget(job)}
                        >
                          Annulla
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Annulla job"
        message="Sei sicuro di voler annullare questo job in coda?"
        confirmLabel="Annulla job"
        destructive
        onConfirm={() => void handleCancel()}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  )
}
