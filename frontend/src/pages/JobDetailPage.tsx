import { Link, useParams } from 'react-router-dom'
import { audioUrl } from '../api/client'
import { AudioPlayer } from '../components/AudioPlayer'
import { StatusChip } from '../components/StatusChip'
import { useJobPolling } from '../hooks/useJobPolling'
import type { JobType } from '../types/api'

const TYPE_LABELS: Record<JobType, string> = {
  text: 'Testo',
  book: 'Libro',
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { job, loading, error } = useJobPolling(jobId ?? null)

  if (loading && !job) {
    return (
      <div className="page">
        <div className="skeleton-block skeleton-block--tall" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert--error" role="alert">
          {error}
        </div>
        <Link to="/coda" className="btn btn--secondary">
          Torna alla coda
        </Link>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Job non trovato</h2>
          <Link to="/coda" className="btn btn--secondary">
            Torna alla coda
          </Link>
        </div>
      </div>
    )
  }

  const canPlay = job.status === 'done'
  const audioSrc = canPlay ? audioUrl(job.id) : ''

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="breadcrumb">
            <Link to="/coda">Coda</Link> / Dettaglio job
          </p>
          <h1 className="page-header__title">Job {job.id.slice(0, 8)}</h1>
        </div>
        <StatusChip status={job.status} />
      </header>

      <dl className="detail-meta">
        <div>
          <dt>Tipo</dt>
          <dd>{TYPE_LABELS[job.job_type] ?? job.job_type}</dd>
        </div>
        <div>
          <dt>Voce</dt>
          <dd>{job.voice_name ?? job.voice_id}</dd>
        </div>
        <div>
          <dt>Creato</dt>
          <dd>{new Date(job.created_at).toLocaleString('it-IT')}</dd>
        </div>
        {job.status === 'running' && job.progress != null && (
          <div>
            <dt>Progresso</dt>
            <dd>
              <div className="progress-bar progress-bar--inline">
                <div className="progress-bar__fill" style={{ width: `${job.progress}%` }} />
                <span className="progress-bar__label">{job.progress}%</span>
              </div>
            </dd>
          </div>
        )}
      </dl>

      {job.status === 'failed' && (
        <div className="alert alert--error" role="alert">
          {job.error ?? 'Il job è terminato con un errore.'}
        </div>
      )}

      {(job.status === 'queued' || job.status === 'running') && (
        <div className="alert alert--info" role="status">
          {job.status === 'queued'
            ? 'Il job è in coda. Verrà elaborato a breve.'
            : 'Sintesi in corso… La pagina si aggiorna automaticamente.'}
        </div>
      )}

      <section className="detail-text">
        <h2>Testo</h2>
        <pre className="detail-text__content">{job.text}</pre>
      </section>

      {canPlay && (
        <section className="detail-player">
          <h2>Riproduzione</h2>
          <AudioPlayer src={audioSrc} />
          <div className="detail-player__download">
            <a href={audioSrc} download={`job-${job.id}.wav`} className="btn btn--secondary">
              Scarica WAV
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
